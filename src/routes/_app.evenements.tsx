import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { CalendarDays, MapPin, Inbox, Pencil, Trash2, Users2, Check, Ban, RotateCcw, ListChecks, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, PageHeader, PrimaryBtn } from "@/components/page-stub";
import { AdminModal, Field, inputCls } from "@/components/admin-modal";
import { PaymentFlow } from "@/components/payment-flow";

export const Route = createFileRoute("/_app/evenements")({
  head: () => ({ meta: [{ title: "Événements — FIAD-Monde" }] }),
  component: EventsPage,
});

type Ev = {
  id: string;
  title: string;
  event_date: string;
  location: string | null;
  type: string | null;
  description: string | null;
  price: number;
  currency: string;
  capacity: number | null;
  status: string;
  registrations?: number;
};

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
  const [payFor, setPayFor] = useState<Ev | null>(null);
  const [regsFor, setRegsFor] = useState<Ev | null>(null);
  const [regList, setRegList] = useState<Array<{ id: string; user_id: string; payment_status: string; created_at: string; name: string }>>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("events").select("*").order("event_date", { ascending: true });
    const list = (data as unknown as Ev[]) ?? [];
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

  const startCreate = () => { setEditing({ id: "", title: "", event_date: new Date().toISOString(), location: "", type: "Webinaire", description: "", price: 0, currency: "XOF", capacity: null, status: "Actif" }); setOpen(true); };
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
    const payload = {
      title,
      event_date: new Date(editing.event_date).toISOString(),
      location: editing.location?.trim() || null,
      type: editing.type?.trim() || null,
      description: editing.description?.trim() || null,
      price: Number(editing.price) || 0,
      currency: editing.currency || "XOF",
      capacity: editing.capacity ?? null,
      status: editing.status || "Actif",
    };
    if (editing.id) {
      const { error } = await supabase.from("events").update(payload as never).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Événement mis à jour");
    } else {
      const { error } = await supabase.from("events").insert(payload as never);
      if (error) return toast.error(error.message);
      toast.success("Événement créé");
    }
    setOpen(false); setEditing(null); refresh();
  };

  async function unregister(e: Ev) {
    if (!user) return;
    const { error } = await supabase.from("event_registrations").delete().eq("event_id", e.id).eq("user_id", user.id);
    if (error) return toast.error(error.message);
    toast.success("Inscription annulée"); refresh();
  }

  async function register(e: Ev) {
    if (!user) return;
    if (e.status === "Annulé") { toast.error("Événement annulé"); return; }
    if ((e.registrations ?? 0) >= (e.capacity ?? Infinity)) { toast.error("Événement complet"); return; }
    if (Number(e.price) > 0) { setPayFor(e); return; }
    const { error } = await supabase.from("event_registrations").insert({ event_id: e.id, user_id: user.id } as never);
    if (error) return toast.error(error.message);
    toast.success("Inscription confirmée"); refresh();
  }

  async function toggleStatus(e: Ev) {
    const newStatus = e.status === "Annulé" ? "Actif" : "Annulé";
    const { error } = await supabase.from("events").update({ status: newStatus } as never).eq("id", e.id);
    if (error) return toast.error(error.message);
    toast.success(newStatus === "Annulé" ? "Événement annulé" : "Événement réactivé");
    refresh();
  }

  async function openRegs(e: Ev) {
    setRegsFor(e);
    const { data } = await supabase.from("event_registrations").select("id,user_id,payment_status,created_at").eq("event_id", e.id).order("created_at", { ascending: false });
    const rows = (data as Array<{ id: string; user_id: string; payment_status: string; created_at: string }>) ?? [];
    if (rows.length) {
      const ids = Array.from(new Set(rows.map((r) => r.user_id)));
      const { data: profs } = await supabase.from("profiles").select("id,first_name,last_name,email").in("id", ids);
      const byId = new Map((profs ?? []).map((p) => [p.id, [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "Membre"]));
      setRegList(rows.map((r) => ({ ...r, name: byId.get(r.user_id) ?? "Membre" })));
    } else setRegList([]);
  }

  async function removeRegistration(regId: string) {
    if (!confirm("Retirer cette inscription ?")) return;
    const { error } = await supabase.from("event_registrations").delete().eq("id", regId);
    if (error) return toast.error(error.message);
    toast.success("Inscription retirée");
    setRegList((l) => l.filter((r) => r.id !== regId));
    refresh();
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        icon={<CalendarDays className="h-6 w-6" />}
        eyebrow="Événements"
        title="Sommets, cliniques & activités"
        subtitle="Inscriptions, paiement en ligne et suivi des participations."
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
            const full = (e.registrations ?? 0) >= (e.capacity ?? Infinity);
            return (
              <Card key={e.id} className="flex flex-col">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-[oklch(0.45_0.22_265)] text-primary-foreground flex flex-col items-center justify-center shrink-0">
                    <span className="text-[10px] uppercase font-bold">{d.toLocaleString("fr", { month: "short" })}</span>
                    <span className="text-xl font-extrabold leading-none">{d.getDate()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {e.type && <span className="text-[10px] uppercase tracking-wider text-primary font-bold bg-primary-soft px-2 py-0.5 rounded-full">{e.type}</span>}
                      {Number(e.price) > 0 ? (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">{e.price.toLocaleString("fr-FR")} {e.currency}</span>
                      ) : (
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">Gratuit</span>
                      )}
                      {e.status === "Annulé" && <span className="text-[10px] font-bold bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">Annulé</span>}
                    </div>
                    <h3 className="font-display font-bold mt-1 leading-tight">{e.title}</h3>
                    {e.location && <div className="text-sm text-muted-foreground mt-1 inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {e.location}</div>}
                  </div>
                </div>
                {e.description && <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{e.description}</p>}
                <div className="mt-auto pt-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground inline-flex items-center gap-1.5"><Users2 className="h-4 w-4" /> {e.registrations ?? 0}{e.capacity ? ` / ${e.capacity}` : ""}</span>
                  {e.status === "Annulé" ? (
                    <span className="font-semibold text-destructive">Annulé</span>
                  ) : isRegistered ? (
                    <button onClick={() => unregister(e)} className="font-semibold text-destructive hover:underline inline-flex items-center gap-1"><Check className="h-4 w-4" /> Inscrit — annuler</button>
                  ) : full ? (
                    <span className="font-semibold text-muted-foreground">Complet</span>
                  ) : (
                    <button onClick={() => register(e)} className="font-semibold text-primary hover:underline">
                      {Number(e.price) > 0 ? "Payer & s'inscrire →" : "S'inscrire →"}
                    </button>
                  )}
                </div>
                {isAdmin && (
                  <div className="mt-4 pt-4 border-t border-border flex items-center justify-end gap-2 flex-wrap">
                    <button onClick={() => openRegs(e)} className="h-8 px-3 rounded-lg border border-border text-xs font-medium inline-flex items-center gap-1.5 hover:bg-secondary"><ListChecks className="h-3.5 w-3.5" /> Inscriptions</button>
                    <button onClick={() => toggleStatus(e)} className="h-8 px-3 rounded-lg border border-border text-xs font-medium inline-flex items-center gap-1.5 hover:bg-secondary">
                      {e.status === "Annulé" ? <><RotateCcw className="h-3.5 w-3.5" /> Réactiver</> : <><Ban className="h-3.5 w-3.5" /> Annuler</>}
                    </button>
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
            <Field label="Description"><textarea className={inputCls + " h-24 py-2"} value={editing.description ?? ""} onChange={(ev) => setEditing({ ...editing, description: ev.target.value })} maxLength={1000} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date & heure"><input type="datetime-local" className={inputCls} value={toLocalInput(editing.event_date)} onChange={(ev) => setEditing({ ...editing, event_date: new Date(ev.target.value).toISOString() })} /></Field>
              <Field label="Type">
                <select className={inputCls} value={editing.type ?? ""} onChange={(ev) => setEditing({ ...editing, type: ev.target.value })}>
                  <option value="">—</option>
                  {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Lieu"><input className={inputCls} value={editing.location ?? ""} onChange={(ev) => setEditing({ ...editing, location: ev.target.value })} maxLength={200} /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Prix"><input type="number" min={0} className={inputCls} value={editing.price} onChange={(ev) => setEditing({ ...editing, price: Number(ev.target.value) })} /></Field>
              <Field label="Devise">
                <select className={inputCls} value={editing.currency} onChange={(ev) => setEditing({ ...editing, currency: ev.target.value })}>
                  {["XOF","EUR","USD","XAF"].map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Capacité"><input type="number" min={0} className={inputCls} value={editing.capacity ?? ""} onChange={(ev) => setEditing({ ...editing, capacity: ev.target.value ? Number(ev.target.value) : null })} placeholder="∞" /></Field>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setOpen(false)} className="h-10 px-4 rounded-full border border-border text-sm font-medium hover:bg-secondary">Annuler</button>
              <PrimaryBtn onClick={save}>Enregistrer</PrimaryBtn>
            </div>
          </div>
        )}
      </AdminModal>

      {user && payFor && (
        <PaymentFlow
          open={!!payFor}
          onClose={() => setPayFor(null)}
          userId={user.id}
          amount={Number(payFor.price)}
          currency={payFor.currency}
          reason={`Inscription : ${payFor.title}`}
          onSuccess={async ({ transactionId }) => {
            const { error } = await supabase.from("event_registrations").insert({
              event_id: payFor.id, user_id: user.id, payment_status: "Payé", transaction_id: transactionId,
            } as never);
            if (error) toast.error(error.message); else toast.success("Inscription confirmée");
            refresh();
          }}
        />
      )}

      <AdminModal open={!!regsFor} onClose={() => setRegsFor(null)} title={regsFor ? `Inscriptions — ${regsFor.title}` : ""}>
        {regList.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Aucune inscription.</p>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {regList.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border">
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("fr-FR")} · <span className={r.payment_status === "Payé" ? "text-emerald-700 font-semibold" : ""}>{r.payment_status}</span></div>
                </div>
                <button onClick={() => removeRegistration(r.id)} className="h-8 px-3 rounded-lg border border-border text-xs font-medium text-destructive inline-flex items-center gap-1.5 hover:bg-destructive/10"><UserMinus className="h-3.5 w-3.5" /> Retirer</button>
              </div>
            ))}
          </div>
        )}
      </AdminModal>
    </div>
  );
}
