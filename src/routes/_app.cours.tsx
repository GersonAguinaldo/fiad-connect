import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Radio, Video, FileText, Link2, Pencil, Trash2, Inbox, Search, X, Users2,
  CalendarClock, PlayCircle, Bell, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, PageHeader, PrimaryBtn } from "@/components/page-stub";
import { AdminModal, Field, inputCls } from "@/components/admin-modal";

export const Route = createFileRoute("/_app/cours")({
  head: () => ({
    meta: [
      { title: "Cours hebdomadaires en direct — La PaDI" },
      { name: "description", content: "Programme des cours hebdomadaires en direct de La PaDI : inscription, lien de connexion, enregistrements et supports." },
      { property: "og:title", content: "Cours hebdomadaires en direct — La PaDI" },
      { property: "og:description", content: "Inscrivez-vous aux cours en direct, rejoignez la visio et retrouvez les rediffusions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CoursPage,
});

type Session = {
  id: string;
  title: string;
  description: string | null;
  host: string | null;
  starts_at: string;
  ends_at: string | null;
  meeting_url: string | null;
  recording_url: string | null;
  notes_url: string | null;
  status: string;
};

type Resource = {
  id: string;
  session_id: string;
  kind: string;
  title: string;
  url: string | null;
};

const STATUSES = ["planifie", "en_cours", "termine", "annule"] as const;
const STATUS_LABEL: Record<string, string> = {
  planifie: "Planifié",
  en_cours: "En direct",
  termine: "Terminé",
  annule: "Annulé",
};
const KINDS = ["video", "audio", "document", "lien"] as const;

const emptySession = (): Session => ({
  id: "", title: "", description: "", host: "", starts_at: "", ends_at: null,
  meeting_url: "", recording_url: "", notes_url: "", status: "planifie",
});

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function CoursPage() {
  const { user, role } = useAuth();
  const isAdmin = role === "admin";
  const [items, setItems] = useState<Session[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [regs, setRegs] = useState<Map<string, { id: string; joined_at: string | null }>>(new Map());
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fHost, setFHost] = useState("");
  const [editing, setEditing] = useState<Session | null>(null);
  const [open, setOpen] = useState(false);
  const [resFor, setResFor] = useState<Session | null>(null);
  const [newRes, setNewRes] = useState({ kind: "document", title: "", url: "" });

  const refresh = useCallback(async () => {
    setLoading(true);
    const [{ data: sessions }, { data: reg }, { data: res }] = await Promise.all([
      supabase.from("live_sessions").select("*").order("starts_at", { ascending: false }),
      supabase.from("live_session_registrations").select("id,session_id,user_id,joined_at"),
      supabase.from("live_session_resources").select("id,session_id,kind,title,url"),
    ]);
    const mine = new Map<string, { id: string; joined_at: string | null }>();
    const c = new Map<string, number>();
    (reg ?? []).forEach((r) => {
      c.set(r.session_id, (c.get(r.session_id) ?? 0) + 1);
      if (r.user_id === user?.id) mine.set(r.session_id, { id: r.id, joined_at: r.joined_at });
    });
    setItems((sessions as Session[]) ?? []);
    setResources((res as Resource[]) ?? []);
    setRegs(mine);
    setCounts(c);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  const hosts = useMemo(
    () => Array.from(new Set(items.map((i) => i.host).filter(Boolean))) as string[],
    [items],
  );

  const visible = useMemo(() => items.filter((s) => {
    if (fStatus && s.status !== fStatus) return false;
    if (fHost && s.host !== fHost) return false;
    if (q) {
      const hay = [s.title, s.description, s.host].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  }), [items, q, fStatus, fHost]);

  const upcoming = visible.filter((s) => s.status !== "termine" && s.status !== "annule" && new Date(s.starts_at) >= new Date(Date.now() - 3 * 3600_000));
  const past = visible.filter((s) => !upcoming.includes(s));

  async function save() {
    if (!editing) return;
    if (!editing.title.trim()) return toast.error("Le titre est requis");
    if (!editing.starts_at) return toast.error("La date et l'heure sont requises");
    const payload = {
      title: editing.title.trim(),
      description: editing.description?.trim() || null,
      host: editing.host?.trim() || null,
      starts_at: new Date(editing.starts_at).toISOString(),
      ends_at: editing.ends_at ? new Date(editing.ends_at).toISOString() : null,
      meeting_url: editing.meeting_url?.trim() || null,
      recording_url: editing.recording_url?.trim() || null,
      notes_url: editing.notes_url?.trim() || null,
      status: editing.status,
    };
    const { error } = editing.id
      ? await supabase.from("live_sessions").update(payload as never).eq("id", editing.id)
      : await supabase.from("live_sessions").insert({ ...payload, created_by: user?.id } as never);
    if (error) return toast.error(error.message);
    toast.success(editing.id ? "Cours mis à jour" : "Cours planifié");
    setOpen(false); setEditing(null); refresh();
  }

  async function remove(id: string) {
    if (!confirm("Supprimer ce cours ?")) return;
    const { error } = await supabase.from("live_sessions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Cours supprimé"); refresh();
  }

  async function register(s: Session) {
    if (!user) return;
    const { error } = await supabase.from("live_session_registrations")
      .insert({ session_id: s.id, user_id: user.id } as never);
    if (error) return toast.error(error.message);
    toast.success("Inscription confirmée — vous recevrez un rappel"); refresh();
  }

  async function unregister(regId: string) {
    const { error } = await supabase.from("live_session_registrations").delete().eq("id", regId);
    if (error) return toast.error(error.message);
    toast.success("Désinscription effectuée"); refresh();
  }

  async function join(s: Session) {
    const reg = regs.get(s.id);
    if (reg && !reg.joined_at) {
      await supabase.from("live_session_registrations")
        .update({ joined_at: new Date().toISOString() } as never).eq("id", reg.id);
      refresh();
    }
    if (s.meeting_url) window.open(s.meeting_url, "_blank", "noopener");
  }

  async function addResource() {
    if (!resFor) return;
    if (!newRes.title.trim() || !newRes.url.trim()) return toast.error("Titre et lien requis");
    const { error } = await supabase.from("live_session_resources").insert({
      session_id: resFor.id, kind: newRes.kind, title: newRes.title.trim(), url: newRes.url.trim(),
    } as never);
    if (error) return toast.error(error.message);
    setNewRes({ kind: "document", title: "", url: "" });
    toast.success("Ressource ajoutée"); refresh();
  }

  async function removeResource(id: string) {
    const { error } = await supabase.from("live_session_resources").delete().eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  }

  function SessionCard({ s }: { s: Session }) {
    const reg = regs.get(s.id);
    const res = resources.filter((r) => r.session_id === s.id);
    const live = s.status === "en_cours";
    return (
      <Card className="flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={"text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full " + (live ? "bg-destructive/10 text-destructive" : "bg-primary-soft text-primary")}>
                {live && <span className="inline-block h-1.5 w-1.5 rounded-full bg-destructive mr-1 animate-pulse" />}
                {STATUS_LABEL[s.status] ?? s.status}
              </span>
              <span className="text-[10px] uppercase tracking-wider font-bold bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">Cours hebdomadaire</span>
            </div>
            <h3 className="text-lg font-display font-bold mt-2">{s.title}</h3>
            {s.host && <div className="text-sm text-muted-foreground mt-1">animé par {s.host}</div>}
          </div>
          <div className="h-10 w-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0"><Radio className="h-5 w-5" /></div>
        </div>

        {s.description && <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{s.description}</p>}

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="h-4 w-4" />
            {new Date(s.starts_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
          </span>
          <span className="inline-flex items-center gap-1.5"><Users2 className="h-4 w-4" /> {counts.get(s.id) ?? 0} inscrits</span>
        </div>

        {(reg || isAdmin) && res.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ressources du cours</p>
            {res.map((r) => (
              <div key={r.id} className="flex items-center gap-2 text-sm">
                {r.kind === "video" ? <Video className="h-4 w-4 text-primary shrink-0" />
                  : r.kind === "lien" ? <Link2 className="h-4 w-4 text-primary shrink-0" />
                  : <FileText className="h-4 w-4 text-primary shrink-0" />}
                <a href={r.url ?? "#"} target="_blank" rel="noopener" className="truncate hover:underline">{r.title}</a>
                {isAdmin && <button onClick={() => removeResource(r.id)} className="ml-auto text-destructive"><X className="h-3.5 w-3.5" /></button>}
              </div>
            ))}
          </div>
        )}

        {!reg && !isAdmin && res.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground italic">Inscrivez-vous pour accéder aux {res.length} ressource(s) du cours.</p>
        )}

        <div className="mt-auto pt-4 flex flex-wrap items-center gap-2">
          {reg ? (
            <>
              {s.meeting_url && s.status !== "termine" && s.status !== "annule" && (
                <button onClick={() => join(s)} className="h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-1.5 hover:opacity-90">
                  <PlayCircle className="h-4 w-4" /> Rejoindre le direct
                </button>
              )}
              {s.recording_url && (
                <a href={s.recording_url} target="_blank" rel="noopener" className="h-9 px-4 rounded-full border border-border text-sm font-medium inline-flex items-center gap-1.5 hover:bg-secondary">
                  <Video className="h-4 w-4" /> Rediffusion
                </a>
              )}
              {s.notes_url && (
                <a href={s.notes_url} target="_blank" rel="noopener" className="h-9 px-4 rounded-full border border-border text-sm font-medium inline-flex items-center gap-1.5 hover:bg-secondary">
                  <FileText className="h-4 w-4" /> Notes
                </a>
              )}
              <span className="text-xs text-emerald-600 font-medium inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Inscrit{reg.joined_at ? " · présence confirmée" : ""}</span>
              <button onClick={() => unregister(reg.id)} className="text-xs text-destructive hover:underline ml-auto">Se désinscrire</button>
            </>
          ) : s.status === "annule" ? (
            <span className="text-sm text-muted-foreground">Session annulée</span>
          ) : (
            <button onClick={() => register(s)} className="h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-1.5 hover:opacity-90">
              <Bell className="h-4 w-4" /> S'inscrire au cours
            </button>
          )}
        </div>

        {isAdmin && (
          <div className="mt-4 pt-4 border-t border-border flex flex-wrap items-center justify-end gap-2">
            <button onClick={() => { setResFor(s); setNewRes({ kind: "document", title: "", url: "" }); }} className="h-8 px-3 rounded-lg border border-border text-xs font-medium inline-flex items-center gap-1.5 hover:bg-secondary"><FileText className="h-3.5 w-3.5" /> Ressources</button>
            <button onClick={() => { setEditing({ ...s, starts_at: toLocalInput(s.starts_at), ends_at: toLocalInput(s.ends_at) }); setOpen(true); }} className="h-8 px-3 rounded-lg border border-border text-xs font-medium inline-flex items-center gap-1.5 hover:bg-secondary"><Pencil className="h-3.5 w-3.5" /> Modifier</button>
            <button onClick={() => remove(s.id)} className="h-8 px-3 rounded-lg border border-border text-xs font-medium text-destructive inline-flex items-center gap-1.5 hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /> Supprimer</button>
          </div>
        )}
      </Card>
    );
  }

  const sessionResources = resFor ? resources.filter((r) => r.session_id === resFor.id) : [];

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        icon={<Radio className="h-6 w-6" />}
        eyebrow="Cours en direct"
        title="Cours hebdomadaires"
        subtitle="Sessions animées en direct, inscriptions, rediffusions et supports."
        action={isAdmin ? <PrimaryBtn onClick={() => { setEditing(emptySession()); setOpen(true); }}>+ Planifier un cours</PrimaryBtn> : undefined}
      />

      {loading ? (
        <Card><p className="text-sm text-muted-foreground">Chargement…</p></Card>
      ) : items.length === 0 ? (
        <Card>
          <div className="py-10 flex flex-col items-center justify-center text-center text-muted-foreground">
            <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center mb-3"><Inbox className="h-5 w-5" /></div>
            <p className="text-sm">Aucun cours en direct planifié pour l'instant.</p>
            {isAdmin && <button onClick={() => { setEditing(emptySession()); setOpen(true); }} className="mt-4 text-sm text-primary font-semibold hover:underline">Planifier le premier cours</button>}
          </div>
        </Card>
      ) : (
        <>
          <Card className="mb-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un cours…" className={inputCls + " pl-9"} />
                </div>
                {(q || fStatus || fHost) && (
                  <button onClick={() => { setQ(""); setFStatus(""); setFHost(""); }} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 shrink-0"><X className="h-3 w-3" /> Réinitialiser</button>
                )}
                <span className="text-xs text-muted-foreground shrink-0">{visible.length} cours</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select className={inputCls} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
                  <option value="">Tous statuts</option>
                  {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
                <select className={inputCls} value={fHost} onChange={(e) => setFHost(e.target.value)}>
                  <option value="">Tous animateurs</option>
                  {hosts.map((h) => <option key={h}>{h}</option>)}
                </select>
              </div>
            </div>
          </Card>

          {upcoming.length > 0 && (
            <>
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">À venir</h2>
              <div className="grid md:grid-cols-2 gap-4 mb-8">{upcoming.map((s) => <SessionCard key={s.id} s={s} />)}</div>
            </>
          )}
          {past.length > 0 && (
            <>
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Sessions passées</h2>
              <div className="grid md:grid-cols-2 gap-4">{past.map((s) => <SessionCard key={s.id} s={s} />)}</div>
            </>
          )}
        </>
      )}

      <AdminModal open={open} onClose={() => setOpen(false)} title={editing?.id ? "Modifier le cours" : "Planifier un cours"}>
        {editing && (
          <div className="space-y-4">
            <Field label="Titre"><input className={inputCls} value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} maxLength={200} /></Field>
            <Field label="Description"><textarea className={inputCls + " h-24 py-2"} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} maxLength={1000} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Animateur"><input className={inputCls} value={editing.host ?? ""} onChange={(e) => setEditing({ ...editing, host: e.target.value })} placeholder="Président Mondial" maxLength={120} /></Field>
              <Field label="Statut">
                <select className={inputCls} value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                  {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Début"><input type="datetime-local" className={inputCls} value={editing.starts_at} onChange={(e) => setEditing({ ...editing, starts_at: e.target.value })} /></Field>
              <Field label="Fin"><input type="datetime-local" className={inputCls} value={editing.ends_at ?? ""} onChange={(e) => setEditing({ ...editing, ends_at: e.target.value || null })} /></Field>
            </div>
            <Field label="Lien de la visio"><input className={inputCls} value={editing.meeting_url ?? ""} onChange={(e) => setEditing({ ...editing, meeting_url: e.target.value })} placeholder="https://meet…" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Lien de rediffusion"><input className={inputCls} value={editing.recording_url ?? ""} onChange={(e) => setEditing({ ...editing, recording_url: e.target.value })} placeholder="https://…" /></Field>
              <Field label="Notes / support"><input className={inputCls} value={editing.notes_url ?? ""} onChange={(e) => setEditing({ ...editing, notes_url: e.target.value })} placeholder="https://…" /></Field>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setOpen(false)} className="h-10 px-4 rounded-full border border-border text-sm font-medium hover:bg-secondary">Annuler</button>
              <PrimaryBtn onClick={save}>Enregistrer</PrimaryBtn>
            </div>
          </div>
        )}
      </AdminModal>

      <AdminModal open={!!resFor} onClose={() => setResFor(null)} title={`Ressources — ${resFor?.title ?? ""}`}>
        <div className="space-y-4">
          <div className="space-y-2">
            {sessionResources.length === 0 && <p className="text-sm text-muted-foreground">Aucune ressource pour ce cours.</p>}
            {sessionResources.map((r) => (
              <div key={r.id} className="flex items-center gap-2 text-sm border border-border rounded-lg px-3 py-2">
                <span className="text-[10px] uppercase font-bold text-primary bg-primary-soft px-2 py-0.5 rounded-full">{r.kind}</span>
                <span className="truncate">{r.title}</span>
                <button onClick={() => removeResource(r.id)} className="ml-auto text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <select className={inputCls} value={newRes.kind} onChange={(e) => setNewRes({ ...newRes, kind: e.target.value })}>
                {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </Field>
            <Field label="Titre"><input className={inputCls} value={newRes.title} onChange={(e) => setNewRes({ ...newRes, title: e.target.value })} /></Field>
          </div>
          <Field label="Lien"><input className={inputCls} value={newRes.url} onChange={(e) => setNewRes({ ...newRes, url: e.target.value })} placeholder="https://…" /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setResFor(null)} className="h-10 px-4 rounded-full border border-border text-sm font-medium hover:bg-secondary">Fermer</button>
            <PrimaryBtn onClick={addResource}>Ajouter la ressource</PrimaryBtn>
          </div>
        </div>
      </AdminModal>
    </div>
  );
}