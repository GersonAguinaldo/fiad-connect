import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { GraduationCap, Users2, Clock, Inbox, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, PageHeader, PrimaryBtn } from "@/components/page-stub";
import { AdminModal, Field, inputCls } from "@/components/admin-modal";

export const Route = createFileRoute("/_app/formations")({
  head: () => ({ meta: [{ title: "Formations — FIAD-Monde" }] }),
  component: FormationsPage,
});

type Formation = { id: string; title: string; instructor: string | null; schedule: string | null; status: string; attendees?: number };

const STATUSES = ["En cours", "Inscriptions ouvertes", "Terminée"];

function FormationsPage() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [items, setItems] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Formation | null>(null);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("formations").select("id,title,instructor,schedule,status").order("created_at", { ascending: false });
    const list = (data as Formation[]) ?? [];
    if (list.length) {
      const { data: enr } = await supabase.from("formation_enrollments").select("formation_id");
      const counts = new Map<string, number>();
      (enr ?? []).forEach((e: { formation_id: string }) => counts.set(e.formation_id, (counts.get(e.formation_id) ?? 0) + 1));
      list.forEach((f) => (f.attendees = counts.get(f.id) ?? 0));
    }
    setItems(list);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const startCreate = () => { setEditing({ id: "", title: "", instructor: "", schedule: "", status: "En cours" }); setOpen(true); };
  const startEdit = (f: Formation) => { setEditing({ ...f }); setOpen(true); };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cette formation ?")) return;
    const { error } = await supabase.from("formations").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Formation supprimée"); refresh(); }
  };

  const save = async () => {
    if (!editing) return;
    const payload = { title: editing.title.trim(), instructor: editing.instructor?.trim() || null, schedule: editing.schedule?.trim() || null, status: editing.status };
    if (!payload.title) { toast.error("Le titre est requis"); return; }
    if (editing.id) {
      const { error } = await supabase.from("formations").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Formation mise à jour");
    } else {
      const { error } = await supabase.from("formations").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Formation créée");
    }
    setOpen(false); setEditing(null); refresh();
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        icon={<GraduationCap className="h-6 w-6" />}
        eyebrow="Formations"
        title="Cours & catalogue"
        subtitle="Cours hebdomadaires, formations continues et certifications."
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
          {items.map((f) => (
            <Card key={f.id}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-primary font-bold">{f.status}</div>
                  <h3 className="text-lg font-display font-bold mt-1">{f.title}</h3>
                  {f.instructor && <div className="text-sm text-muted-foreground mt-1">par {f.instructor}</div>}
                </div>
                <div className="h-10 w-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center"><GraduationCap className="h-5 w-5" /></div>
              </div>
              <div className="mt-4 flex items-center gap-5 text-sm text-muted-foreground">
                {f.schedule && <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" /> {f.schedule}</span>}
                <span className="inline-flex items-center gap-1.5"><Users2 className="h-4 w-4" /> {f.attendees ?? 0} inscrits</span>
              </div>
              {isAdmin && (
                <div className="mt-4 pt-4 border-t border-border flex items-center justify-end gap-2">
                  <button onClick={() => startEdit(f)} className="h-8 px-3 rounded-lg border border-border text-xs font-medium inline-flex items-center gap-1.5 hover:bg-secondary"><Pencil className="h-3.5 w-3.5" /> Modifier</button>
                  <button onClick={() => remove(f.id)} className="h-8 px-3 rounded-lg border border-border text-xs font-medium text-destructive inline-flex items-center gap-1.5 hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /> Supprimer</button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <AdminModal open={open} onClose={() => setOpen(false)} title={editing?.id ? "Modifier la formation" : "Nouvelle formation"}>
        {editing && (
          <div className="space-y-4">
            <Field label="Titre"><input className={inputCls} value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} maxLength={200} /></Field>
            <Field label="Formateur"><input className={inputCls} value={editing.instructor ?? ""} onChange={(e) => setEditing({ ...editing, instructor: e.target.value })} maxLength={120} /></Field>
            <Field label="Calendrier"><input className={inputCls} value={editing.schedule ?? ""} onChange={(e) => setEditing({ ...editing, schedule: e.target.value })} placeholder="Lundi 19h00 GMT" maxLength={120} /></Field>
            <Field label="Statut">
              <select className={inputCls} value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
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
