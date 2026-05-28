import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Wallet, Search, CheckCircle2, XCircle, Clock, Download, ArrowDownCircle, ArrowUpCircle, Receipt, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, Card } from "@/components/page-stub";
import { inputCls } from "@/components/admin-modal";

export const Route = createFileRoute("/_app/mes-finances")({
  head: () => ({ meta: [{ title: "Mes finances — La PaDI" }] }),
  component: MyFinancesPage,
});

type Tx = {
  id: string;
  reason: string;
  amount: number;
  currency: string;
  method: string | null;
  status: string;
  occurred_at: string;
  created_at: string;
};

function MyFinancesPage() {
  const { user } = useAuth();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("Tous");
  const [methodF, setMethodF] = useState("Tous");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [detail, setDetail] = useState<Tx | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("transactions")
        .select("id,reason,amount,currency,method,status,occurred_at,created_at")
        .eq("user_id", user.id)
        .order("occurred_at", { ascending: false });
      setTxs((data as Tx[]) ?? []);
      setLoading(false);
    })();
  }, [user?.id]);

  const methods = useMemo(
    () => Array.from(new Set(txs.map((t) => t.method).filter(Boolean))) as string[],
    [txs]
  );

  const filtered = useMemo(
    () =>
      txs.filter(
        (t) =>
          (statusF === "Tous" || t.status === statusF) &&
          (methodF === "Tous" || t.method === methodF) &&
          (!fromDate || new Date(t.occurred_at) >= new Date(fromDate)) &&
          (!toDate || new Date(t.occurred_at) <= new Date(toDate + "T23:59:59")) &&
          (q === "" || [t.reason, t.id].some((v) => (v ?? "").toLowerCase().includes(q.toLowerCase())))
      ),
    [txs, q, statusF, methodF, fromDate, toDate]
  );

  const totals = useMemo(() => {
    const reussi = filtered.filter((t) => t.status === "Réussi").reduce((s, t) => s + Number(t.amount), 0);
    const pending = filtered.filter((t) => t.status === "En attente").reduce((s, t) => s + Number(t.amount), 0);
    const remb = filtered.filter((t) => t.status === "Remboursé").reduce((s, t) => s + Number(t.amount), 0);
    return { reussi, pending, remb, count: filtered.length };
  }, [filtered]);

  function reset() {
    setQ(""); setStatusF("Tous"); setMethodF("Tous"); setFromDate(""); setToDate("");
  }

  function exportCsv() {
    const rows = [
      ["ID", "Date", "Motif", "Montant", "Devise", "Méthode", "Statut"],
      ...filtered.map((t) => [
        t.id,
        new Date(t.occurred_at).toLocaleString("fr-FR"),
        t.reason,
        String(t.amount),
        t.currency,
        t.method ?? "",
        t.status,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `mes-transactions-${Date.now()}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  const fmt = (n: number, c: string) => `${new Intl.NumberFormat("fr-FR").format(n)} ${c}`;

  return (
    <div className="max-w-[1200px] mx-auto">
      <PageHeader
        icon={<Wallet className="h-6 w-6" />}
        eyebrow="Mon espace"
        title="Mes finances"
        subtitle="Historique complet de mes paiements et cotisations."
        action={
          <button
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-full border border-border bg-card text-sm font-semibold hover:bg-secondary disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> Exporter CSV
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard tone="success" icon={<ArrowUpCircle className="h-4 w-4" />} label="Total payé" value={fmt(totals.reussi, "XOF")} />
        <StatCard tone="warning" icon={<Clock className="h-4 w-4" />} label="En attente" value={fmt(totals.pending, "XOF")} />
        <StatCard tone="muted" icon={<ArrowDownCircle className="h-4 w-4" />} label="Remboursé" value={fmt(totals.remb, "XOF")} />
        <StatCard tone="primary" icon={<Receipt className="h-4 w-4" />} label="Transactions" value={String(totals.count)} />
      </div>

      {/* Filters */}
      <Card className="mb-4 !p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un motif ou un identifiant…" className={inputCls + " pl-9 w-full"} />
            </div>
            <button onClick={reset} className="shrink-0 h-10 px-4 rounded-md border border-border text-sm font-medium hover:bg-secondary">Réinitialiser</button>
            <span className="shrink-0 text-xs text-muted-foreground">{filtered.length} résultat(s)</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            <select value={statusF} onChange={(e) => setStatusF(e.target.value)} className={inputCls}>
              {["Tous", "Réussi", "En attente", "Échoué", "Remboursé"].map((s) => <option key={s}>{s}</option>)}
            </select>
            <select value={methodF} onChange={(e) => setMethodF(e.target.value)} className={inputCls}>
              <option>Tous</option>
              {methods.map((m) => <option key={m}>{m}</option>)}
            </select>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={inputCls} />
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={inputCls} />
            <div className="hidden lg:block" />
          </div>
        </div>
      </Card>

      {/* List */}
      <Card className="!p-0 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">Aucune transaction pour ces critères.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((t) => (
              <li key={t.id}>
                <button onClick={() => setDetail(t)} className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-secondary/60 transition">
                  <StatusDot status={t.status} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{t.reason}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                      <span>{new Date(t.occurred_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</span>
                      {t.method && <span className="inline-flex items-center gap-1"><CreditCard className="h-3 w-3" />{t.method}</span>}
                      <span className="font-mono opacity-70">#{t.id.slice(0, 8)}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-display font-bold text-foreground">{fmt(Number(t.amount), t.currency)}</div>
                    <div className="mt-1">{statusBadge(t.status)}</div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {detail && (
        <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-card rounded-2xl border border-border shadow-[var(--shadow-elevated)] max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Reçu de transaction</div>
                <h3 className="font-display font-extrabold text-xl mt-1">{detail.reason}</h3>
              </div>
              {statusBadge(detail.status)}
            </div>
            <div className="mt-5 rounded-xl bg-secondary/60 p-4 text-center">
              <div className="text-xs text-muted-foreground">Montant</div>
              <div className="text-3xl font-display font-extrabold text-primary mt-1">{fmt(Number(detail.amount), detail.currency)}</div>
            </div>
            <dl className="mt-5 text-sm divide-y divide-border">
              <Row label="Identifiant" value={<span className="font-mono text-xs">{detail.id}</span>} />
              <Row label="Date" value={new Date(detail.occurred_at).toLocaleString("fr-FR")} />
              <Row label="Méthode" value={detail.method ?? "—"} />
              <Row label="Devise" value={detail.currency} />
              <Row label="Enregistré le" value={new Date(detail.created_at).toLocaleString("fr-FR")} />
            </dl>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setDetail(null)} className="h-10 px-4 rounded-md border border-border text-sm font-medium hover:bg-secondary">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-2.5 flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground text-right">{value}</dd>
    </div>
  );
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "success" | "warning" | "muted" | "primary" }) {
  const tones = {
    success: "bg-[color-mix(in_oklab,var(--success)_15%,white)] text-[var(--color-success)]",
    warning: "bg-[color-mix(in_oklab,var(--warning)_18%,white)] text-[oklch(0.45_0.12_75)]",
    muted: "bg-secondary text-muted-foreground",
    primary: "bg-primary-soft text-primary",
  } as const;
  return (
    <div className="bg-card rounded-2xl border border-border p-4 shadow-[var(--shadow-card)] flex items-center gap-3">
      <div className={"h-10 w-10 rounded-xl flex items-center justify-center " + tones[tone]}>{icon}</div>
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
        <div className="text-lg font-display font-extrabold text-foreground">{value}</div>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const map: Record<string, string> = {
    Réussi: "bg-[var(--color-success)]",
    "En attente": "bg-[var(--color-warning)]",
    Échoué: "bg-destructive",
    Remboursé: "bg-muted-foreground",
  };
  const Icon = status === "Réussi" ? CheckCircle2 : status === "Échoué" ? XCircle : Clock;
  return (
    <div className={"h-10 w-10 rounded-xl flex items-center justify-center text-white shrink-0 " + (map[status] ?? "bg-muted-foreground")}>
      <Icon className="h-5 w-5" />
    </div>
  );
}

function statusBadge(s: string) {
  const cls =
    s === "Réussi"
      ? "bg-emerald-100 text-emerald-800"
      : s === "Échoué"
      ? "bg-destructive/10 text-destructive"
      : s === "Remboursé"
      ? "bg-amber-100 text-amber-900"
      : "bg-primary-soft text-primary";
  return <span className={"px-2.5 py-1 rounded-full text-xs font-medium " + cls}>{s}</span>;
}