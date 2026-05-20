import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { CalendarDays, MapPin, Inbox, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, PageHeader, PrimaryBtn } from "@/components/page-stub";
import { AdminModal, Field, inputCls } from "@/components/admin-modal";

export const Route = createFileRoute("/_app/evenements")({
  head: () => ({ meta: [{ title: "Événements — FIAD-Monde" }] }),
  component: EventsPage,
});

type Ev = { id: string; title: string; event_date: string; location: string | null; type: string | null; registrations?: number };

const TYPES = ["Sommet", "Clinique", "Webinaire", "Sortie", "Assemblée", "Atelier"];

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EventsPage() {
  const { user, role } = useAuth();
  const isAdmin = role === "admin";
  const [events, setEvents] = useState<Ev[]>([]);
  const [myRegs, setMyRegs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Ev | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("events").select("id,title,event_date,location,type").order("event_date", { ascending: true });
    const list = (data as Ev[]) ?? [];
    if (list.length) {
      const { data: reg } = await supabase.from("event_registrations").select("event_id,user_id");
      const counts = new Map<string, number>();
      const mine = new Set<string>();
      (reg ?? []).forEach((r: { event_id: string; user_id: string }) => {
        counts.set(r.event_id, (counts.get(r.event_id) ?? 0) + 1);
        if (r.user_id === user?.id) mine.add(r.event_id);
      });
      list.forEach((e) => (e.registrations = counts.get(e.id) ?? 0));
      setMyRegs(mine);
    }
    setEvents(list);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  const startCreate = () => { setEditing({ id: "", title: "", event_date: new Date().toISOString(), location: "", type: "Webinaire" }); setOpen(true); };
  const startEdit = (e: Ev) => { setEditing({ ...e }); setOpen(true); };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cet événement ?")) return;
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Événement supprimé"); refresh(); }
  };

  const save = async () => {
    if (!editing) return;
    const title = editing.title.trim();
    if (!title) { toast.error("Le titre est requis"); return; }
    if (!editing.event_date) { toast.error("La date est requise"); return; }
    const payload = { title, event_date: new Date(editing.event_date).toISOString(), location: editing.location?.trim() || null, type: editing.type?.trim() || null };
    if (editing.id) {
      const { error } = await supabase.from("events").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Événement mis à jour");
    } else {
      const { error } = await supabase.from("events").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Événement créé");
    }
    setOpen(false); setEditing(null); refresh();
  };

  const toggleReg = async (e: Ev) => {
    if (!user) return;
    if (myRegs.has(e.id)) {
      const { error } = await supabase.from("event_registrations").delete().eq("event_id", e.id).eq("user_id", user.id);
      if (error) return toast.error(error.message);
      toast.success("Inscription annulée");
    } else {
      const { error } = await supabase.from("event_registrations").insert({ event_id: e.id, user_id: user.id });
      if (error) return toast.error(error.message);
      toast.success("Inscription confirmée");
    }
    refresh();
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        icon={<CalendarDays className="h-6 w-6" />}
        eyebrow="Événements"
        title="Calendrier & activités"
        subtitle="Sommets, cliniques, webinaires et sorties à venir."
        action={isAdmin ? <PrimaryBtn onClick={startCreate}>+ Nouvel événement</PrimaryBtn> : undefined}
      />
      {loading ? (
        <Card><p className="text-sm text-muted-foreground">Chargement…</p></Card>
      ) : events.length === 0 ? (
        <Card>
          <div className="py-10 flex flex-col items-center justify-center text-center text-muted-foreground">
            <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center mb-3"><Inbox className="h-5 w-5" /></div>
            <p className="text-sm">Aucun événement programmé.</p>
            {isAdmin && <button onClick={startCreate} className="mt-4 text-sm text-primary font-semibold hover:underline">Créer le premier événement</button>}
          </div>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((e) => {
            const d = new Date(e.event_date);
            const isRegistered = myRegs.has(e.id);
            return (
              <Card key={e.id}>
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-[oklch(0.45_0.22_265)] text-primary-foreground flex flex-col items-center justify-center">
                    <span className="text-[10px] uppercase font-bold">{d.toLocaleString("fr", { month: "short" })}</span>
                    <span className="text-xl font-extrabold leading-none">{d.getDate()}</span>
                  </div>
                  <div className="flex-1">
                    {e.type && <div className="text-xs uppercase tracking-wider text-primary font-bold">{e.type}</div>}
                    <h3 className="font-display font-bold mt-1 leading-tight">{e.title}</h3>
                    {e.location && <div className="text-sm text-muted-foreground mt-1 inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {e.location}</div>}
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{e.registrations ?? 0} inscrits</span>
                  <button onClick={() => toggleReg(e)} className={"font-semibold hover:underline " + (isRegistered ? "text-destructive" : "text-primary")}>
                    {isRegistered ? "Se désinscrire" : "S'inscrire →"}
                  </button>
                </div>
                {isAdmin && (
                  <div className="mt-4 pt-4 border-t border-border flex items-center justify-end gap-2">
                    <button onClick={() => startEdit(e)} className="h-8 px-3 rounded-lg border border-border text-xs font-medium inline-flex items-center gap-1.5 hover:bg-secondary"><Pencil className="h-3.5 w-3.5" /> Modifier</button>
                    <button onClick={() => remove(e.id)} className="h-8 px-3 rounded-lg border border-border text-xs font-medium text-destructive inline-flex items-center gap-1.5 hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /> Supprimer</button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <AdminModal open={open} onClose={() => setOpen(false)} title={editing?.id ? "Modifier l'événement" : "Nouvel événement"}>
        {editing && (
          <div className="space-y-4">
            <Field label="Titre"><input className={inputCls} value={editing.title} onChange={(ev) => setEditing({ ...editing, title: ev.target.value })} maxLength={200} /></Field>
            <Field label="Date & heure"><input type="datetime-local" className={inputCls} value={toLocalInput(editing.event_date)} onChange={(ev) => setEditing({ ...editing, event_date: new Date(ev.target.value).toISOString() })} /></Field>
            <Field label="Lieu"><input className={inputCls} value={editing.location ?? ""} onChange={(ev) => setEditing({ ...editing, location: ev.target.value })} maxLength={200} /></Field>
            <Field label="Type">
              <select className={inputCls} value={editing.type ?? ""} onChange={(ev) => setEditing({ ...editing, type: ev.target.value })}>
                <option value="">—</option>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
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
