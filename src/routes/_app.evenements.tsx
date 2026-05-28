import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays, MapPin, Inbox, Pencil, Trash2, Users2, Check, Ban, RotateCcw,
  ListChecks, UserMinus, Search, Paperclip, FileText, Video, Music, Image as ImageIcon,
  Link as LinkIcon, Upload, Plus, X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, PageHeader, PrimaryBtn } from "@/components/page-stub";
import { AdminModal, Field, inputCls } from "@/components/admin-modal";
import { PaymentFlow } from "@/components/payment-flow";

export const Route = createFileRoute("/_app/evenements")({
  head: () => ({ meta: [{ title: "Événements — La PaDI" }] }),
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
  target_categories: string[];
  target_membership_types: string[];
  target_cities: string[];
  target_countries: string[];
  registrations?: number;
};

type Resource = {
  id: string;
  event_id: string;
  kind: "file" | "url";
  category: string;
  title: string;
  url: string | null;
  storage_path: string | null;
  mime_type: string | null;
  created_at: string;
};

type Profile = { category: string; membership_type: string; city: string | null; country: string | null };

const TYPES = ["Sommet", "PART (Projet académie de la Réussite totale)", "Webinaire", "Sortie", "Assemblée", "Atelier"];
const CATEGORIES = ["Ambassadeur du Développement", "Sympathisant", "Ordinaire"];
const MEMBERSHIP_TYPES = ["Classique", "Liberté Financière"];
const RES_CATEGORIES = [
  { key: "pdf", label: "PDF", icon: FileText },
  { key: "video", label: "Vidéo", icon: Video },
  { key: "audio", label: "Audio", icon: Music },
  { key: "image", label: "Image", icon: ImageIcon },
  { key: "autre", label: "Autre", icon: Paperclip },
] as const;

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function detectCategory(mime: string): string {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "application/pdf") return "pdf";
  return "autre";
}

function eventVisible(e: Ev, p: Profile | null): boolean {
  const inOrEmpty = (arr: string[], val: string | null | undefined) =>
    arr.length === 0 || (val ? arr.includes(val) : false);
  if (!p) return e.target_categories.length === 0 && e.target_membership_types.length === 0 && e.target_cities.length === 0 && e.target_countries.length === 0;
  return (
    inOrEmpty(e.target_categories, p.category) &&
    inOrEmpty(e.target_membership_types, p.membership_type) &&
    inOrEmpty(e.target_cities, p.city) &&
    inOrEmpty(e.target_countries, p.country)
  );
}

function EventsPage() {
  const { user, role } = useAuth();
  const isAdmin = role === "admin";
  const [events, setEvents] = useState<Ev[]>([]);
  const [myRegs, setMyRegs] = useState<Set<string>>(new Set());
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Ev | null>(null);
  const [payFor, setPayFor] = useState<Ev | null>(null);
  const [regsFor, setRegsFor] = useState<Ev | null>(null);
  const [regList, setRegList] = useState<Array<{ id: string; user_id: string; payment_status: string; created_at: string; name: string }>>([]);
  const [resFor, setResFor] = useState<Ev | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);

  // Filters
  const [q, setQ] = useState("");
  const [fType, setFType] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fPay, setFPay] = useState("");
  const [fCity, setFCity] = useState("");
  const [fCountry, setFCountry] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    const [{ data: evs }, profRes] = await Promise.all([
      supabase.from("events").select("*").order("event_date", { ascending: true }),
      user ? supabase.from("profiles").select("category,membership_type,city,country").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    const prof = (profRes.data as Profile | null) ?? null;
    setProfile(prof);
    const list = (evs as unknown as Ev[]) ?? [];
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
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const visible = useMemo(() => {
    return events.filter((e) => {
      if (!isAdmin && !eventVisible(e, profile)) return false;
      if (fType && e.type !== fType) return false;
      if (fStatus && e.status !== fStatus) return false;
      if (fPay === "paid" && Number(e.price) <= 0) return false;
      if (fPay === "free" && Number(e.price) > 0) return false;
      if (fCity && !(e.location ?? "").toLowerCase().includes(fCity.toLowerCase())) return false;
      if (fCountry && !(e.location ?? "").toLowerCase().includes(fCountry.toLowerCase())) return false;
      if (q) {
        const hay = [e.title, e.description, e.location, e.type].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [events, isAdmin, profile, q, fType, fStatus, fPay, fCity, fCountry]);

  const startCreate = () => {
    setEditing({
      id: "", title: "", event_date: new Date().toISOString(), location: "", type: "Webinaire",
      description: "", price: 0, currency: "XOF", capacity: null, status: "Actif",
      target_categories: [], target_membership_types: [], target_cities: [], target_countries: [],
    });
    setOpen(true);
  };
  const startEdit = (e: Ev) => {
    setEditing({
      ...e,
      target_categories: e.target_categories ?? [],
      target_membership_types: e.target_membership_types ?? [],
      target_cities: e.target_cities ?? [],
      target_countries: e.target_countries ?? [],
    });
    setOpen(true);
  };

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
      target_categories: editing.target_categories,
      target_membership_types: editing.target_membership_types,
      target_cities: editing.target_cities,
      target_countries: editing.target_countries,
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

  async function openResources(e: Ev) {
    setResFor(e);
    const { data } = await supabase.from("event_resources").select("*").eq("event_id", e.id).order("created_at", { ascending: false });
    setResources((data as Resource[]) ?? []);
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

      <Card className="mb-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un événement…" className={inputCls + " pl-9"} />
            </div>
            {(q || fType || fStatus || fPay || fCity || fCountry) && (
              <button onClick={() => { setQ(""); setFType(""); setFStatus(""); setFPay(""); setFCity(""); setFCountry(""); }} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 shrink-0"><X className="h-3 w-3" /> Réinitialiser</button>
            )}
            <span className="text-xs text-muted-foreground shrink-0">{visible.length} événement{visible.length > 1 ? "s" : ""}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            <select className={inputCls} value={fType} onChange={(e) => setFType(e.target.value)}>
              <option value="">Tous types</option>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
            <select className={inputCls} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
              <option value="">Tous statuts</option>
              <option>Actif</option>
              <option>Annulé</option>
            </select>
            <select className={inputCls} value={fPay} onChange={(e) => setFPay(e.target.value)}>
              <option value="">Tous tarifs</option>
              <option value="free">Gratuit</option>
              <option value="paid">Payant</option>
            </select>
            <input className={inputCls} placeholder="Ville" value={fCity} onChange={(e) => setFCity(e.target.value)} />
            <input className={inputCls} placeholder="Pays" value={fCountry} onChange={(e) => setFCountry(e.target.value)} />
          </div>
        </div>
      </Card>

      {loading ? (
        <Card><p className="text-sm text-muted-foreground">Chargement…</p></Card>
      ) : visible.length === 0 ? (
        <Card>
          <div className="py-10 flex flex-col items-center justify-center text-center text-muted-foreground">
            <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center mb-3"><Inbox className="h-5 w-5" /></div>
            <p className="text-sm">Aucun événement à afficher.</p>
            {isAdmin && <button onClick={startCreate} className="mt-4 text-sm text-primary font-semibold hover:underline">Créer un événement</button>}
          </div>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((e) => {
            const d = new Date(e.event_date);
            const isRegistered = myRegs.has(e.id);
            const full = (e.registrations ?? 0) >= (e.capacity ?? Infinity);
            const isTargeted = (e.target_categories?.length ?? 0) + (e.target_membership_types?.length ?? 0) + (e.target_cities?.length ?? 0) + (e.target_countries?.length ?? 0) > 0;
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
                      {isAdmin && isTargeted && <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">Ciblé</span>}
                    </div>
                    <h3 className="font-display font-bold mt-1 leading-tight">{e.title}</h3>
                    {e.location && <div className="text-sm text-muted-foreground mt-1 inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {e.location}</div>}
                  </div>
                </div>
                {e.description && <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{e.description}</p>}
                <div className="mt-3 flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground inline-flex items-center gap-1.5"><Users2 className="h-4 w-4" /> {e.registrations ?? 0}{e.capacity ? ` / ${e.capacity}` : ""}</span>
                  <button onClick={() => openResources(e)} className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"><Paperclip className="h-3.5 w-3.5" /> Ressources</button>
                </div>
                <div className="mt-auto pt-4 flex items-center justify-end text-sm">
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
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
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

            <div className="pt-3 border-t border-border">
              <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Ciblage (vide = visible par tous)</div>
              <div className="space-y-3">
                <ChipMulti label="Catégories de membre" options={CATEGORIES} value={editing.target_categories} onChange={(v) => setEditing({ ...editing, target_categories: v })} />
                <ChipMulti label="Types d'adhésion" options={MEMBERSHIP_TYPES} value={editing.target_membership_types} onChange={(v) => setEditing({ ...editing, target_membership_types: v })} />
                <TagInput label="Villes autorisées" value={editing.target_cities} onChange={(v) => setEditing({ ...editing, target_cities: v })} placeholder="Ex: Dakar, Abidjan…" />
                <TagInput label="Pays autorisés" value={editing.target_countries} onChange={(v) => setEditing({ ...editing, target_countries: v })} placeholder="Ex: Sénégal, Côte d'Ivoire…" />
              </div>
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

      <AdminModal open={!!resFor} onClose={() => { setResFor(null); setResources([]); }} title={resFor ? `Ressources — ${resFor.title}` : ""}>
        {resFor && (
          <ResourceManager
            event={resFor}
            isAdmin={isAdmin}
            resources={resources}
            onChange={(rs) => setResources(rs)}
          />
        )}
      </AdminModal>
    </div>
  );
}

/* ---------- Multi-select helpers ---------- */

function ChipMulti({ label, options, value, onChange }: { label: string; options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter((v) => v !== o) : [...value, o]);
  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = value.includes(o);
          return (
            <button key={o} type="button" onClick={() => toggle(o)} className={"h-8 px-3 rounded-full text-xs font-medium border transition " + (on ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary")}>
              {o}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

function TagInput({ label, value, onChange, placeholder }: { label: string; value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const t = draft.trim();
    if (!t) return;
    if (!value.includes(t)) onChange([...value, t]);
    setDraft("");
  };
  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {value.map((v) => (
          <span key={v} className="h-7 pl-2.5 pr-1 rounded-full bg-primary-soft text-primary text-xs font-medium inline-flex items-center gap-1">
            {v}
            <button onClick={() => onChange(value.filter((x) => x !== v))} className="h-5 w-5 rounded-full hover:bg-primary/10 inline-flex items-center justify-center"><X className="h-3 w-3" /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input className={inputCls + " flex-1"} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} placeholder={placeholder} />
        <button type="button" onClick={add} className="h-10 px-3 rounded-lg border border-border text-sm hover:bg-secondary inline-flex items-center gap-1"><Plus className="h-4 w-4" /></button>
      </div>
    </Field>
  );
}

/* ---------- Resource manager ---------- */

function ResourceManager({ event, isAdmin, resources, onChange }: { event: Ev; isAdmin: boolean; resources: Resource[]; onChange: (r: Resource[]) => void }) {
  const [mode, setMode] = useState<"file" | "url">("file");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("pdf");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!title.trim()) return toast.error("Titre requis");
    setBusy(true);
    try {
      if (mode === "file") {
        if (!file) { toast.error("Fichier requis"); return; }
        const path = `${event.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("event-resources").upload(path, file, { contentType: file.type });
        if (upErr) { toast.error(upErr.message); return; }
        const { data: pub } = supabase.storage.from("event-resources").getPublicUrl(path);
        const { data, error } = await supabase.from("event_resources").insert({
          event_id: event.id, kind: "file", category: detectCategory(file.type), title: title.trim(),
          url: pub.publicUrl, storage_path: path, mime_type: file.type,
        } as never).select().single();
        if (error) { toast.error(error.message); return; }
        onChange([data as Resource, ...resources]);
      } else {
        if (!url.trim()) { toast.error("URL requise"); return; }
        const { data, error } = await supabase.from("event_resources").insert({
          event_id: event.id, kind: "url", category, title: title.trim(), url: url.trim(),
        } as never).select().single();
        if (error) { toast.error(error.message); return; }
        onChange([data as Resource, ...resources]);
      }
      setTitle(""); setUrl(""); setFile(null);
      toast.success("Ressource ajoutée");
    } finally { setBusy(false); }
  }

  async function del(r: Resource) {
    if (!confirm("Supprimer cette ressource ?")) return;
    if (r.storage_path) await supabase.storage.from("event-resources").remove([r.storage_path]);
    const { error } = await supabase.from("event_resources").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    onChange(resources.filter((x) => x.id !== r.id));
    toast.success("Ressource supprimée");
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 max-h-[40vh] overflow-y-auto">
        {resources.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Aucune ressource pour l'instant.</p>
        ) : resources.map((r) => {
          const cat = RES_CATEGORIES.find((c) => c.key === r.category) ?? RES_CATEGORIES[4];
          const Icon = cat.icon;
          return (
            <div key={r.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0"><Icon className="h-4 w-4" /></div>
                <div className="min-w-0">
                  <a href={r.url ?? "#"} target="_blank" rel="noopener" className="font-medium text-sm truncate block text-primary hover:underline">{r.title}</a>
                  <div className="text-xs text-muted-foreground">{cat.label} · {r.kind === "file" ? "Fichier" : "Lien"}</div>
                </div>
              </div>
              {isAdmin && (
                <button onClick={() => del(r)} className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-destructive inline-flex items-center justify-center"><Trash2 className="h-4 w-4" /></button>
              )}
            </div>
          );
        })}
      </div>

      {isAdmin && (
        <div className="pt-3 border-t border-border space-y-3">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Ajouter une ressource</div>
          <div className="flex gap-2">
            <button onClick={() => setMode("file")} className={"h-9 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 " + (mode === "file" ? "bg-primary text-primary-foreground" : "border border-border")}><Upload className="h-3.5 w-3.5" /> Fichier</button>
            <button onClick={() => setMode("url")} className={"h-9 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 " + (mode === "url" ? "bg-primary text-primary-foreground" : "border border-border")}><LinkIcon className="h-3.5 w-3.5" /> Lien externe</button>
          </div>
          <Field label="Titre"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} /></Field>
          {mode === "file" ? (
            <Field label="Fichier (PDF, vidéo, audio, image)"><input type="file" className={inputCls + " py-1.5"} accept=".pdf,image/*,video/*,audio/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field>
          ) : (
            <>
              <Field label="URL"><input className={inputCls} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" /></Field>
              <Field label="Catégorie">
                <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
                  {RES_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </Field>
            </>
          )}
          <div className="flex justify-end">
            <PrimaryBtn onClick={add} disabled={busy}>{busy ? "Ajout…" : "Ajouter"}</PrimaryBtn>
          </div>
        </div>
      )}
    </div>
  );
}