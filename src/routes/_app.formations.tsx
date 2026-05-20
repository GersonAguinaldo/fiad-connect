import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { GraduationCap, Users2, Clock, Inbox, Pencil, Trash2, ExternalLink, Award } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, PageHeader, PrimaryBtn } from "@/components/page-stub";
import { AdminModal, Field, inputCls } from "@/components/admin-modal";

export const Route = createFileRoute("/_app/formations")({
  head: () => ({ meta: [{ title: "Formations — FIAD-Monde" }] }),
  component: FormationsPage,
});

type Formation = {
  id: string;
  title: string;
  instructor: string | null;
  schedule: string | null;
  status: string;
  description: string | null;
  type: string;
  starts_on: string | null;
  resource_url: string | null;
  attendees?: number;
};

type Enrollment = { id: string; formation_id: string; progress: number; completed_at: string | null };

const STATUSES = ["Inscriptions ouvertes", "En cours", "Terminée"];
const TYPES = ["Hebdomadaire", "Continue", "Spécifique"];

function FormationsPage() {
  const { user, role } = useAuth();
  const isAdmin = role === "admin";
  const [items, setItems] = useState<Formation[]>([]);
  const [myEnr, setMyEnr] = useState<Map<string, Enrollment>>(new Map());
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Formation | null>(null);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("formations").select("*").order("created_at", { ascending: false });
    const list = (data as unknown as Formation[]) ?? [];
    if (list.length) {
      const { data: enr } = await supabase.from("formation_enrollments").select("id,formation_id,user_id,progress,completed_at");
      const counts = new Map<string, number>();
      const mine = new Map<string, Enrollment>();
      (enr ?? []).forEach((e: { id: string; formation_id: string; user_id: string; progress: number; completed_at: string | null }) => {
        counts.set(e.formation_id, (counts.get(e.formation_id) ?? 0) + 1);
        if (e.user_id === user?.id) mine.set(e.formation_id, { id: e.id, formation_id: e.formation_id, progress: e.progress, completed_at: e.completed_at });
      });
      list.forEach((f) => (f.attendees = counts.get(f.id) ?? 0));
      setMyEnr(mine);
    }
    setItems(list);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  const startCreate = () => { setEditing({ id: "", title: "", instructor: "", schedule: "", status: "Inscriptions ouvertes", description: "", type: "Hebdomadaire", starts_on: null, resource_url: "" }); setOpen(true); };
  const startEdit = (f: Formation) => { setEditing({ ...f }); setOpen(true); };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cette formation ?")) return;
    const { error } = await supabase.from("formations").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Formation supprimée"); refresh(); }
  };

  const save = async () => {
    if (!editing) return;
    const payload = {
      title: editing.title.trim(),
      instructor: editing.instructor?.trim() || null,
      schedule: editing.schedule?.trim() || null,
      status: editing.status,
      description: editing.description?.trim() || null,
      type: editing.type,
      starts_on: editing.starts_on || null,
      resource_url: editing.resource_url?.trim() || null,
    };
    if (!payload.title) { toast.error("Le titre est requis"); return; }
    if (editing.id) {
      const { error } = await supabase.from("formations").update(payload as never).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Formation mise à jour");
    } else {
      const { error } = await supabase.from("formations").insert(payload as never);
      if (error) return toast.error(error.message);
      toast.success("Formation créée");
    }
    setOpen(false); setEditing(null); refresh();
  };

  async function enroll(f: Formation) {
    if (!user) return;
    const { error } = await supabase.from("formation_enrollments").insert({ formation_id: f.id, user_id: user.id } as never);
    if (error) return toast.error(error.message);
    toast.success("Inscription confirmée"); refresh();
  }

  async function unenroll(enrollmentId: string) {
    if (!confirm("Se désinscrire de cette formation ?")) return;
    const { error } = await supabase.from("formation_enrollments").delete().eq("id", enrollmentId);
    if (error) return toast.error(error.message);
    toast.success("Désinscription effectuée"); refresh();
  }

  async function setProgress(enrollment: Enrollment, value: number) {
    const completed = value >= 100 ? new Date().toISOString() : null;
    const { error } = await supabase
      .from("formation_enrollments")
      .update({ progress: value, completed_at: completed } as never)
      .eq("id", enrollment.id);
    if (error) return toast.error(error.message);
    toast.success(value >= 100 ? "Formation terminée 🎉" : "Progression mise à jour");
    refresh();
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        icon={<GraduationCap className="h-6 w-6" />}
        eyebrow="Formations"
        title="Cours hebdomadaires & formations continues"
        subtitle="Catalogue, inscriptions, ressources et progression."
        action={isAdmin ? <PrimaryBtn onClick={startCreate}>+ Nouvelle formation</PrimaryBtn> : undefined}
      />
      {loading ? (
        <Card><p className="text-sm text-muted-foreground">Chargement…</p></Card>
      ) : items.length === 0 ? (
        <Card>
          <div className="py-10 flex flex-col items-center justify-center text-center text-muted-foreground">
            <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center mb-3"><Inbox className="h-5 w-5" /></div>
            <p className="text-sm">Aucune formation publiée pour l'instant.</p>
            {isAdmin && <button onClick={startCreate} className="mt-4 text-sm text-primary font-semibold hover:underline">Créer la première formation</button>}
          </div>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {items.map((f) => {
            const enr = myEnr.get(f.id);
            return (
              <Card key={f.id} className="flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wider text-primary font-bold bg-primary-soft px-2 py-0.5 rounded-full">{f.type}</span>
                      <span className="text-[10px] uppercase tracking-wider font-bold bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{f.status}</span>
                    </div>
                    <h3 className="text-lg font-display font-bold mt-2">{f.title}</h3>
                    {f.instructor && <div className="text-sm text-muted-foreground mt-1">par {f.instructor}</div>}
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0"><GraduationCap className="h-5 w-5" /></div>
                </div>
                {f.description && <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{f.description}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {f.schedule && <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" /> {f.schedule}</span>}
                  {f.starts_on && <span>Début : {new Date(f.starts_on).toLocaleDateString("fr-FR")}</span>}
                  <span className="inline-flex items-center gap-1.5"><Users2 className="h-4 w-4" /> {f.attendees ?? 0} inscrits</span>
                </div>
                {f.resource_url && (
                  <a href={f.resource_url} target="_blank" rel="noopener" className="mt-3 text-sm text-primary font-semibold inline-flex items-center gap-1.5 hover:underline">
                    <ExternalLink className="h-4 w-4" /> Ressources & documents
                  </a>
                )}

                <div className="mt-auto pt-4">
                  {enr ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground inline-flex items-center gap-1"><Award className="h-3.5 w-3.5 text-primary" /> Progression — {enr.progress}%</span>
                        <button onClick={() => unenroll(enr.id)} className="text-destructive hover:underline">Se désinscrire</button>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${enr.progress}%` }} /></div>
                      <div className="flex gap-1.5 pt-1">
                        {[25, 50, 75, 100].map((v) => (
                          <button key={v} onClick={() => setProgress(enr, v)} className={"text-xs h-7 px-2 rounded-md border " + (enr.progress >= v ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary")}>{v}%</button>
                        ))}
                      </div>
                      {enr.completed_at && <p className="text-xs text-emerald-600 font-medium">Certificat délivré le {new Date(enr.completed_at).toLocaleDateString("fr-FR")}</p>}
                    </div>
                  ) : (
                    <button onClick={() => enroll(f)} className="text-sm font-semibold text-primary hover:underline">S'inscrire à la formation →</button>
                  )}
                </div>

                {isAdmin && (
                  <div className="mt-4 pt-4 border-t border-border flex items-center justify-end gap-2">
                    <button onClick={() => startEdit(f)} className="h-8 px-3 rounded-lg border border-border text-xs font-medium inline-flex items-center gap-1.5 hover:bg-secondary"><Pencil className="h-3.5 w-3.5" /> Modifier</button>
                    <button onClick={() => remove(f.id)} className="h-8 px-3 rounded-lg border border-border text-xs font-medium text-destructive inline-flex items-center gap-1.5 hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /> Supprimer</button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <AdminModal open={open} onClose={() => setOpen(false)} title={editing?.id ? "Modifier la formation" : "Nouvelle formation"}>
        {editing && (
          <div className="space-y-4">
            <Field label="Titre"><input className={inputCls} value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} maxLength={200} /></Field>
            <Field label="Description"><textarea className={inputCls + " h-24 py-2"} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} maxLength={1000} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <select className={inputCls} value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value })}>
                  {TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Statut">
                <select className={inputCls} value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Formateur"><input className={inputCls} value={editing.instructor ?? ""} onChange={(e) => setEditing({ ...editing, instructor: e.target.value })} maxLength={120} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Calendrier"><input className={inputCls} value={editing.schedule ?? ""} onChange={(e) => setEditing({ ...editing, schedule: e.target.value })} placeholder="Lundi 19h00 GMT" maxLength={120} /></Field>
              <Field label="Date de début"><input type="date" className={inputCls} value={editing.starts_on ?? ""} onChange={(e) => setEditing({ ...editing, starts_on: e.target.value || null })} /></Field>
            </div>
            <Field label="Lien des ressources"><input className={inputCls} value={editing.resource_url ?? ""} onChange={(e) => setEditing({ ...editing, resource_url: e.target.value })} placeholder="https://…" /></Field>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setOpen(false)} className="h-10 px-4 rounded-full border border-border text-sm font-medium hover:bg-secondary">Annuler</button>
              <PrimaryBtn onClick={save}>Enregistrer</PrimaryBtn>
            </div>
          </div>
        )}
      </AdminModal>
    </div>
  );
}
