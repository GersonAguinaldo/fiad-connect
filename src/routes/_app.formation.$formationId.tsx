import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft, GraduationCap, CheckCircle2, Circle, Clock, Pencil, Trash2,
  Plus, Award, ExternalLink, ListOrdered,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, PageHeader, PrimaryBtn } from "@/components/page-stub";
import { AdminModal, Field, inputCls } from "@/components/admin-modal";

export const Route = createFileRoute("/_app/formation/$formationId")({
  head: () => ({
    meta: [
      { title: "Parcours de formation — La PaDI" },
      { name: "description", content: "Suivez les modules de la formation, votre progression et obtenez votre certificat de réussite La PaDI." },
      { property: "og:title", content: "Parcours de formation — La PaDI" },
      { property: "og:description", content: "Modules, progression et certificat de réussite." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FormationDetail,
});

type Formation = {
  id: string; title: string; description: string | null; instructor: string | null;
  schedule: string | null; status: string; type: string; starts_on: string | null;
  resource_url: string | null; prerequisites: string | null; duration_hours: number | null;
};
type Module = {
  id: string; formation_id: string; title: string; description: string | null;
  position: number; resource_url: string | null; duration_minutes: number | null;
};
type Cert = { id: string; code: string; issued_at: string; holder_name: string | null };

const emptyModule = (formation_id: string, position: number): Module => ({
  id: "", formation_id, title: "", description: "", position, resource_url: "", duration_minutes: null,
});

function FormationDetail() {
  const { formationId } = Route.useParams() as { formationId: string };
  const { user, role } = useAuth();
  const isAdmin = role === "admin";

  const [formation, setFormation] = useState<Formation | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [cert, setCert] = useState<Cert | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Module | null>(null);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [{ data: f }, { data: mods }, { data: prog }, { data: enr }, { data: c }] = await Promise.all([
      supabase.from("formations").select("*").eq("id", formationId).maybeSingle(),
      supabase.from("formation_modules").select("*").eq("formation_id", formationId).order("position"),
      supabase.from("formation_module_progress").select("module_id,user_id").eq("formation_id", formationId),
      supabase.from("formation_enrollments").select("id,user_id").eq("formation_id", formationId),
      supabase.from("certificates").select("id,code,issued_at,holder_name,user_id").eq("formation_id", formationId),
    ]);
    setFormation((f as Formation) ?? null);
    setModules((mods as Module[]) ?? []);
    setDone(new Set((prog ?? []).filter((p) => p.user_id === user?.id).map((p) => p.module_id)));
    setEnrollmentId((enr ?? []).find((e) => e.user_id === user?.id)?.id ?? null);
    setCert(((c ?? []).find((x) => x.user_id === user?.id) as Cert) ?? null);
    setLoading(false);
  }, [formationId, user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  const total = modules.length;
  const completed = modules.filter((m) => done.has(m.id)).length;
  const percent = total ? Math.round((completed / total) * 100) : 0;

  async function enroll() {
    if (!user) return;
    const { error } = await supabase.from("formation_enrollments")
      .insert({ formation_id: formationId, user_id: user.id } as never);
    if (error) return toast.error(error.message);
    toast.success("Inscription confirmée"); refresh();
  }

  async function issueCertificate(nextCompleted: number) {
    if (!user || !formation || total === 0 || nextCompleted < total || cert) return;
    const { data: profile } = await supabase.from("profiles")
      .select("first_name,last_name,email").eq("id", user.id).maybeSingle();
    const holder = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || profile?.email || user.email || "Membre La PaDI";
    const code = `PADI-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    const { error } = await supabase.from("certificates").insert({
      user_id: user.id, formation_id: formationId, code,
      holder_name: holder, formation_title: formation.title,
    } as never);
    if (error && !error.message.includes("duplicate")) return toast.error(error.message);
    toast.success("Formation terminée 🎉 Votre certificat est disponible.");
  }

  async function toggleModule(m: Module) {
    if (!user) return;
    if (!enrollmentId) return toast.error("Inscrivez-vous d'abord à la formation");
    const isDone = done.has(m.id);
    if (isDone) {
      const { error } = await supabase.from("formation_module_progress")
        .delete().eq("module_id", m.id).eq("user_id", user.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("formation_module_progress").insert({
        user_id: user.id, formation_id: formationId, module_id: m.id, completed: true,
      } as never);
      if (error) return toast.error(error.message);
    }
    const nextCompleted = isDone ? completed - 1 : completed + 1;
    const nextPercent = total ? Math.round((nextCompleted / total) * 100) : 0;
    await supabase.from("formation_enrollments").update({
      progress: nextPercent,
      completed_at: nextPercent >= 100 ? new Date().toISOString() : null,
    } as never).eq("id", enrollmentId);
    if (nextPercent >= 100) await issueCertificate(nextCompleted);
    refresh();
  }

  async function saveModule() {
    if (!editing) return;
    if (!editing.title.trim()) return toast.error("Le titre du module est requis");
    const payload = {
      formation_id: formationId,
      title: editing.title.trim(),
      description: editing.description?.trim() || null,
      position: Number(editing.position) || 0,
      resource_url: editing.resource_url?.trim() || null,
      duration_minutes: editing.duration_minutes ? Number(editing.duration_minutes) : null,
    };
    const { error } = editing.id
      ? await supabase.from("formation_modules").update(payload as never).eq("id", editing.id)
      : await supabase.from("formation_modules").insert(payload as never);
    if (error) return toast.error(error.message);
    toast.success(editing.id ? "Module mis à jour" : "Module ajouté");
    setOpen(false); setEditing(null); refresh();
  }

  async function removeModule(id: string) {
    if (!confirm("Supprimer ce module ?")) return;
    const { error } = await supabase.from("formation_modules").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Module supprimé"); refresh();
  }

  if (loading) return <div className="max-w-[1000px] mx-auto"><Card><p className="text-sm text-muted-foreground">Chargement…</p></Card></div>;
  if (!formation) return (
    <div className="max-w-[1000px] mx-auto">
      <Card><p className="text-sm text-muted-foreground">Formation introuvable.</p></Card>
    </div>
  );

  return (
    <div className="max-w-[1000px] mx-auto">
      <Link to="/formations" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3">
        <ArrowLeft className="h-4 w-4" /> Retour aux formations
      </Link>

      <PageHeader
        icon={<GraduationCap className="h-6 w-6" />}
        eyebrow={formation.type}
        title={formation.title}
        subtitle={formation.instructor ? `Animée par ${formation.instructor}` : "Parcours de formation"}
        action={isAdmin ? (
          <PrimaryBtn onClick={() => { setEditing(emptyModule(formationId, modules.length + 1)); setOpen(true); }}>
            + Ajouter un module
          </PrimaryBtn>
        ) : undefined}
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <h2 className="font-display font-bold mb-2 inline-flex items-center gap-2"><ListOrdered className="h-4 w-4 text-primary" /> Modules du parcours</h2>
            {modules.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Aucun module publié pour cette formation.</p>
            ) : (
              <ul className="divide-y divide-border">
                {modules.map((m, i) => {
                  const isDone = done.has(m.id);
                  return (
                    <li key={m.id} className="py-3 flex items-start gap-3">
                      <button onClick={() => toggleModule(m)} className="mt-0.5 shrink-0" aria-label={isDone ? "Marquer non terminé" : "Marquer terminé"}>
                        {isDone ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={"text-sm font-semibold " + (isDone ? "line-through text-muted-foreground" : "")}>
                          {i + 1}. {m.title}
                        </p>
                        {m.description && <p className="text-sm text-muted-foreground mt-0.5">{m.description}</p>}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                          {m.duration_minutes ? <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {m.duration_minutes} min</span> : null}
                          {m.resource_url && (
                            <a href={m.resource_url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-primary hover:underline">
                              <ExternalLink className="h-3.5 w-3.5" /> Support du module
                            </a>
                          )}
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => { setEditing({ ...m }); setOpen(true); }} className="h-8 w-8 rounded-lg border border-border inline-flex items-center justify-center hover:bg-secondary"><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => removeModule(m.id)} className="h-8 w-8 rounded-lg border border-border text-destructive inline-flex items-center justify-center hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {(formation.description || formation.prerequisites) && (
            <Card>
              {formation.description && (
                <>
                  <h2 className="font-display font-bold mb-1">À propos</h2>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{formation.description}</p>
                </>
              )}
              {formation.prerequisites && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold">Prérequis</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{formation.prerequisites}</p>
                </div>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <h2 className="font-display font-bold mb-3">Ma progression</h2>
            {!enrollmentId ? (
              <>
                <p className="text-sm text-muted-foreground mb-3">Inscrivez-vous pour suivre les modules et obtenir votre certificat.</p>
                <PrimaryBtn onClick={enroll}>S'inscrire à la formation</PrimaryBtn>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-semibold">{percent}%</span>
                  <span className="text-muted-foreground">{completed}/{total} modules</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
                </div>
              </>
            )}
          </Card>

          <Card>
            <h2 className="font-display font-bold mb-2 inline-flex items-center gap-2"><Award className="h-4 w-4 text-primary" /> Certificat</h2>
            {cert ? (
              <div className="text-sm space-y-2">
                <p className="text-emerald-600 font-medium">Certificat délivré le {new Date(cert.issued_at).toLocaleDateString("fr-FR")}</p>
                <p className="text-muted-foreground">Code : <span className="font-mono font-semibold text-foreground">{cert.code}</span></p>
                <Link to="/mes-certificats" className="text-primary font-semibold hover:underline">Voir mes certificats →</Link>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Terminez les {total || "…"} modules pour recevoir automatiquement votre certificat de réussite.</p>
            )}
          </Card>

          <Card>
            <h2 className="font-display font-bold mb-2">Informations</h2>
            <dl className="text-sm space-y-1.5">
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Statut</dt><dd className="font-medium">{formation.status}</dd></div>
              {formation.schedule && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Calendrier</dt><dd className="font-medium text-right">{formation.schedule}</dd></div>}
              {formation.starts_on && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Début</dt><dd className="font-medium">{new Date(formation.starts_on).toLocaleDateString("fr-FR")}</dd></div>}
              {formation.duration_hours != null && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Durée</dt><dd className="font-medium">{formation.duration_hours} h</dd></div>}
            </dl>
            {formation.resource_url && (
              <a href={formation.resource_url} target="_blank" rel="noopener" className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary font-semibold hover:underline">
                <ExternalLink className="h-4 w-4" /> Ressources générales
              </a>
            )}
          </Card>
        </div>
      </div>

      <AdminModal open={open} onClose={() => setOpen(false)} title={editing?.id ? "Modifier le module" : "Nouveau module"}>
        {editing && (
          <div className="space-y-4">
            <Field label="Titre"><input className={inputCls} value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} maxLength={200} /></Field>
            <Field label="Description"><textarea className={inputCls + " h-24 py-2"} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} maxLength={1000} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ordre"><input type="number" className={inputCls} value={editing.position} onChange={(e) => setEditing({ ...editing, position: Number(e.target.value) })} /></Field>
              <Field label="Durée (minutes)"><input type="number" className={inputCls} value={editing.duration_minutes ?? ""} onChange={(e) => setEditing({ ...editing, duration_minutes: e.target.value ? Number(e.target.value) : null })} /></Field>
            </div>
            <Field label="Lien du support (vidéo, PDF…)"><input className={inputCls} value={editing.resource_url ?? ""} onChange={(e) => setEditing({ ...editing, resource_url: e.target.value })} placeholder="https://…" /></Field>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setOpen(false)} className="h-10 px-4 rounded-full border border-border text-sm font-medium hover:bg-secondary">Annuler</button>
              <PrimaryBtn onClick={saveModule}><Plus className="h-4 w-4 inline mr-1" />Enregistrer</PrimaryBtn>
            </div>
          </div>
        )}
      </AdminModal>
    </div>
  );
}