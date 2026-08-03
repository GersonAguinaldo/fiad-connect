import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Avatar } from "@/components/avatar";
import { Card, PageHeader, PrimaryBtn } from "@/components/page-stub";
import { Field, inputCls } from "@/components/admin-modal";
import { Mail, Phone, MapPin, Calendar, History, Bot, UserCog } from "lucide-react";

const STATUSES = ["Actif", "Inactif", "Suspendu", "Radié", "En attente"] as const;

export const Route = createFileRoute("/_app/membres/$memberId")({
  component: MemberDetail,
  notFoundComponent: () => <div className="p-8">Membre introuvable. <Link to="/membres" className="text-primary">Retour</Link></div>,
});

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  category: string;
  status: string;
  created_at: string;
};

type StatusEvent = {
  id: string;
  old_status: string | null;
  new_status: string;
  reason: string | null;
  automatic: boolean;
  created_at: string;
};

function MemberDetail() {
  const { memberId } = (Route.useParams as () => { memberId: string })();
  const [m, setM] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<StatusEvent[]>([]);
  const [status, setStatus] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadHistory() {
    const { data } = await supabase
      .from("member_status_history")
      .select("id, old_status, new_status, reason, automatic, created_at")
      .eq("profile_id", memberId)
      .order("created_at", { ascending: false });
    setHistory((data ?? []) as StatusEvent[]);
  }

  useEffect(() => {
    supabase.from("profiles").select("*").eq("id", memberId).maybeSingle().then(({ data }) => {
      setM(data as Profile | null);
      setStatus((data as Profile | null)?.status ?? "");
      setLoading(false);
    });
    void loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

  async function saveStatus() {
    if (!m || status === m.status) return;
    if (!reason.trim()) {
      toast.error("Indiquez un motif pour tracer ce changement de statut.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ status, status_reason: reason.trim(), updated_at: new Date().toISOString() })
      .eq("id", m.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setM({ ...m, status });
    setReason("");
    toast.success("Statut mis a jour, le membre a ete notifie.");
    void loadHistory();
  }

  if (loading) return <div className="p-8 text-muted-foreground">Chargement…</div>;
  if (!m) return <div className="p-8">Membre introuvable. <Link to="/membres" className="text-primary">Retour</Link></div>;

  const name = [m.first_name, m.last_name].filter(Boolean).join(" ") || m.email || "Membre";

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow="Membre"
        title={name}
        subtitle={`Adhérent depuis le ${new Date(m.created_at).toLocaleDateString("fr-FR")}`}
        icon={<Avatar name={name} />}
      />
      <div className="grid lg:grid-cols-3 gap-6">
        <Card>
          <h2 className="text-sm font-display font-bold uppercase tracking-wider text-muted-foreground mb-4">À propos</h2>
          <Info icon={<Mail className="h-4 w-4" />} label="Email" value={m.email ?? "—"} />
          <Info icon={<Phone className="h-4 w-4" />} label="Téléphone" value={m.phone ?? "—"} />
          <Info icon={<MapPin className="h-4 w-4" />} label="Localisation" value={[m.city, m.country].filter(Boolean).join(", ") || "—"} />
          <Info icon={<Calendar className="h-4 w-4" />} label="Adhésion" value={new Date(m.created_at).toLocaleDateString("fr-FR")} />
        </Card>
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-bold">Statut</h2>
            <span className="text-xs px-2.5 py-1 rounded-full bg-primary-soft text-primary font-semibold">{m.category}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Statut courant : <span className="font-medium text-foreground">{m.status}</span>
          </p>

          <div className="mt-4 grid sm:grid-cols-[200px_1fr_auto] gap-3 items-end">
            <Field label="Nouveau statut">
              <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Motif (obligatoire)">
              <input
                className={inputCls}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex : exception accordee, cotisation regularisee…"
              />
            </Field>
            <PrimaryBtn onClick={saveStatus} disabled={saving || status === m.status}>
              {saving ? "…" : "Appliquer"}
            </PrimaryBtn>
          </div>

          <div className="mt-8">
            <h3 className="text-sm font-display font-bold uppercase tracking-wider text-muted-foreground mb-3 inline-flex items-center gap-2">
              <History className="h-4 w-4" /> Historique des statuts
            </h3>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun changement enregistre.</p>
            ) : (
              <ul className="space-y-3">
                {history.map((h) => (
                  <li key={h.id} className="flex gap-3 text-sm">
                    <div className="h-8 w-8 shrink-0 rounded-full bg-secondary text-muted-foreground inline-flex items-center justify-center">
                      {h.automatic ? <Bot className="h-4 w-4" /> : <UserCog className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 border-b border-border/60 pb-3">
                      <div className="font-medium text-foreground">
                        {(h.old_status ?? "—")} → {h.new_status}
                        <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                          {h.automatic ? "automatique" : "manuel"}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(h.created_at).toLocaleString("fr-FR")}
                        {h.reason ? ` · ${h.reason}` : ""}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div className="flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-medium text-foreground">{value}</div>
      </div>
    </div>
  );
}
