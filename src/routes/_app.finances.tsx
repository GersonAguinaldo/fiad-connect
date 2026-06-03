import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Wallet, Inbox, Search, Eye, CheckCircle2, XCircle, Clock, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, PageHeader, PrimaryBtn } from "@/components/page-stub";
import { AdminModal, Field, inputCls } from "@/components/admin-modal";
import { useAuth } from "@/hooks/use-auth";
import { CsvImport } from "@/components/csv-import";

export const Route = createFileRoute("/_app/finances")({
  head: () => ({ meta: [{ title: "Finances — La PaDI" }] }),
  component: FinancesPage,
});

type Tx = { id: string; user_id: string; reason: string; amount: number; currency: string; method: string | null; status: string; occurred_at: string; member_name?: string };

function FinancesPage() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [txs, setTxs] = useState<Tx[]>([]);
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState<string>("Tous");
  const [methodF, setMethodF] = useState<string>("Tous");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [minAmt, setMinAmt] = useState<string>("");
  const [maxAmt, setMaxAmt] = useState<string>("");
  const [detail, setDetail] = useState<Tx | null>(null);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);

  async function refresh() {
    setLoading(true);
    const { data } = await supabase.from("transactions").select("*").order("occurred_at", { ascending: false });
    const list = (data as Tx[]) ?? [];
    if (list.length) {
      const ids = Array.from(new Set(list.map((t) => t.user_id)));
      const { data: profs } = await supabase.from("profiles").select("id,first_name,last_name,email").in("id", ids);
      const byId = new Map((profs ?? []).map((p) => [p.id, [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "Membre"]));
      list.forEach((t) => (t.member_name = byId.get(t.user_id) ?? "Membre"));
    }
    setTxs(list); setLoading(false);
  }
  useEffect(() => { refresh(); }, []);

  const methods = useMemo(() => Array.from(new Set(txs.map((t) => t.method).filter(Boolean))) as string[], [txs]);

  const filtered = useMemo(() => txs.filter((t) =>
    (statusF === "Tous" || t.status === statusF) &&
    (methodF === "Tous" || t.method === methodF) &&
    (!fromDate || new Date(t.occurred_at) >= new Date(fromDate)) &&
    (!toDate || new Date(t.occurred_at) <= new Date(toDate + "T23:59:59")) &&
    (!minAmt || Number(t.amount) >= Number(minAmt)) &&
    (!maxAmt || Number(t.amount) <= Number(maxAmt)) &&
    (q === "" || [t.member_name, t.reason, t.id].some((v) => (v ?? "").toLowerCase().includes(q.toLowerCase())))
  ), [txs, q, statusF, methodF, fromDate, toDate, minAmt, maxAmt]);

  const totals = useMemo(() => {
    const reussi = filtered.filter((t) => t.status === "Réussi").reduce((s, t) => s + Number(t.amount), 0);
    const pending = filtered.filter((t) => t.status === "En attente").length;
    const failed = filtered.filter((t) => t.status === "Échoué").length;
    return { reussi, pending, failed };
  }, [filtered]);

  async function setStatus(t: Tx, status: string) {
    const { error } = await supabase.from("transactions").update({ status } as never).eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success("Statut mis à jour"); setDetail(null); refresh();
  }

  function statusBadge(s: string) {
    const cls = s === "Réussi" ? "bg-emerald-100 text-emerald-800" : s === "Échoué" ? "bg-destructive/10 text-destructive" : s === "Remboursé" ? "bg-amber-100 text-amber-900" : "bg-primary-soft text-primary";
    return <span className={"px-2.5 py-1 rounded-full text-xs font-medium " + cls}>{s}</span>;
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        icon={<Wallet className="h-6 w-6" />}
        eyebrow="Finances"
        title="Paiements & transactions"
        subtitle="Historique complet des paiements simulés."
        action={isAdmin ? (
          <button onClick={() => setImportOpen(true)} className="h-10 px-4 rounded-full border border-border text-sm font-medium hover:bg-secondary inline-flex items-center gap-1.5"><Upload className="h-4 w-4" /> Importer</button>
        ) : undefined}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Encaissé (filtré)" value={`${new Intl.NumberFormat("fr-FR").format(totals.reussi)} XOF`} tone="success" />
        <StatCard icon={<Clock className="h-4 w-4" />} label="En attente" value={String(totals.pending)} tone="primary" />
        <StatCard icon={<XCircle className="h-4 w-4" />} label="Échouées" value={String(totals.failed)} tone="destructive" />
      </div>

      <Card>
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher membre, motif, ID…" className={inputCls + " pl-9"} />
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{filtered.length} résultat{filtered.length > 1 ? "s" : ""}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <select className={inputCls} value={statusF} onChange={(e) => setStatusF(e.target.value)}>
              {["Tous","Réussi","En attente","Échoué","Remboursé"].map((s) => <option key={s}>{s}</option>)}
            </select>
            <select className={inputCls} value={methodF} onChange={(e) => setMethodF(e.target.value)}>
              <option>Tous</option>
              {methods.map((m) => <option key={m}>{m}</option>)}
            </select>
            <input type="date" className={inputCls} value={fromDate} onChange={(e) => setFromDate(e.target.value)} title="Du" />
            <input type="date" className={inputCls} value={toDate} onChange={(e) => setToDate(e.target.value)} title="Au" />
            <input type="number" className={inputCls} value={minAmt} onChange={(e) => setMinAmt(e.target.value)} placeholder="Montant min" />
            <input type="number" className={inputCls} value={maxAmt} onChange={(e) => setMaxAmt(e.target.value)} placeholder="Montant max" />
          </div>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground py-6">Chargement…</p>
        ) : filtered.length === 0 ? (
          <div className="py-10 flex flex-col items-center justify-center text-center text-muted-foreground"><div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center mb-3"><Inbox className="h-5 w-5" /></div><p className="text-sm">Aucune transaction enregistrée.</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground"><tr className="text-left">{["Membre","Motif","Montant","Mode","Date","Statut",""].map(h => <th key={h} className="py-2">{h}</th>)}</tr></thead>
            <tbody>{filtered.map(t => (
              <tr key={t.id} className="border-t border-border">
                <td className="py-3 font-medium">{t.member_name}</td>
                <td className="py-3">{t.reason}</td>
                <td className="py-3 tabular-nums font-semibold">{new Intl.NumberFormat("fr-FR").format(Number(t.amount))} {t.currency}</td>
                <td className="py-3 text-muted-foreground">{t.method ?? "—"}</td>
                <td className="py-3 text-muted-foreground">{new Date(t.occurred_at).toLocaleString("fr-FR")}</td>
                <td className="py-3">{statusBadge(t.status)}</td>
                <td className="py-3 text-right"><button onClick={() => setDetail(t)} className="h-8 px-3 rounded-lg border border-border text-xs font-medium inline-flex items-center gap-1.5 hover:bg-secondary"><Eye className="h-3.5 w-3.5" /> Détails</button></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Card>

      <AdminModal open={!!detail} onClose={() => setDetail(null)} title="Détail de la transaction">
        {detail && (
          <div className="space-y-4">
            <div className="rounded-xl bg-primary-soft p-4">
              <div className="text-[10px] uppercase tracking-wider text-primary font-bold">{detail.reason}</div>
              <div className="mt-1 flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground">{detail.id}</span>
                <span className="font-extrabold text-xl">{new Intl.NumberFormat("fr-FR").format(Number(detail.amount))} {detail.currency}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Membre"><div className="font-medium">{detail.member_name}</div></Field>
              <Field label="Mode"><div className="font-medium">{detail.method ?? "—"}</div></Field>
              <Field label="Date"><div className="font-medium">{new Date(detail.occurred_at).toLocaleString("fr-FR")}</div></Field>
              <Field label="Statut"><div>{statusBadge(detail.status)}</div></Field>
            </div>
            {isAdmin && (
              <div className="pt-3 border-t border-border">
                <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Actions admin</div>
                <div className="flex flex-wrap gap-2">
                  {detail.status !== "Réussi" && <PrimaryBtn onClick={() => setStatus(detail, "Réussi")}>Marquer comme réussi</PrimaryBtn>}
                  {detail.status !== "Remboursé" && detail.status === "Réussi" && <button onClick={() => setStatus(detail, "Remboursé")} className="h-10 px-4 rounded-full border border-border text-sm font-medium hover:bg-secondary">Rembourser</button>}
                  {detail.status !== "Échoué" && <button onClick={() => setStatus(detail, "Échoué")} className="h-10 px-4 rounded-full border border-border text-sm font-medium text-destructive hover:bg-destructive/10">Marquer échoué</button>}
                </div>
              </div>
            )}
          </div>
        )}
      </AdminModal>

      {isAdmin && (
        <CsvImport
          open={importOpen}
          onClose={() => setImportOpen(false)}
          onDone={refresh}
          title="Transactions"
          columns={[
            { key: "user_email", label: "Email du membre", required: true, hint: "doit exister parmi les membres" },
            { key: "reason", label: "Motif", required: true },
            { key: "amount", label: "Montant", required: true },
            { key: "currency", label: "Devise", hint: "XOF | EUR | USD | XAF" },
            { key: "method", label: "Méthode", hint: "Mobile Money, Carte, Espèces…" },
            { key: "status", label: "Statut", hint: "Réussi | En attente | Échoué | Remboursé" },
            { key: "occurred_at", label: "Date", hint: "AAAA-MM-JJ ou ISO" },
          ]}
          sample={{
            user_email: "membre@example.com", reason: "Cotisation 2025", amount: "25000",
            currency: "XOF", method: "Mobile Money", status: "Réussi", occurred_at: "2025-01-15",
          }}
          transform={async (row) => {
            if (!row.user_email) return { ok: false as const, error: "Email requis" };
            if (!row.reason) return { ok: false as const, error: "Motif requis" };
            if (!row.amount || isNaN(Number(row.amount))) return { ok: false as const, error: "Montant invalide" };
            const { data: prof } = await supabase.from("profiles").select("id").eq("email", row.user_email).maybeSingle();
            if (!prof) return { ok: false as const, error: `Membre introuvable: ${row.user_email}` };
            const d = row.occurred_at ? new Date(row.occurred_at.replace(" ", "T")) : new Date();
            return { ok: true as const, payload: {
              user_id: prof.id,
              reason: row.reason,
              amount: Number(row.amount),
              currency: row.currency || "XOF",
              method: row.method || null,
              status: row.status || "Réussi",
              occurred_at: isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString(),
            } };
          }}
          onCommit={async (payloads) => {
            const { error, count } = await supabase.from("transactions").insert(payloads as never, { count: "exact" });
            if (error) throw new Error(error.message);
            return { inserted: count ?? payloads.length, skipped: 0, errors: [] };
          }}
        />
      )}
    </div>
  );
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "success" | "primary" | "destructive" }) {
  const t = tone === "success" ? "bg-emerald-100 text-emerald-700" : tone === "destructive" ? "bg-destructive/10 text-destructive" : "bg-primary-soft text-primary";
  return (
    <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
      <div className={"h-10 w-10 rounded-xl flex items-center justify-center " + t}>{icon}</div>
      <div><div className="text-xs text-muted-foreground">{label}</div><div className="font-display font-extrabold text-lg">{value}</div></div>
    </div>
  );
}
