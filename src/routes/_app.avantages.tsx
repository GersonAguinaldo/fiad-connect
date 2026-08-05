import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Gift, Inbox, Pencil, Trash2, ExternalLink, Search, Star, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, PageHeader, PrimaryBtn } from "@/components/page-stub";
import { AdminModal, Field, inputCls } from "@/components/admin-modal";

export const Route = createFileRoute("/_app/avantages")({
  head: () => ({
    meta: [
      { title: "Mes avantages — La PaDI" },
      { name: "description", content: "Portail des avantages réservés aux membres La PaDI : conditions d'accès, utilisation et satisfaction." },
      { property: "og:title", content: "Mes avantages — La PaDI" },
      { property: "og:description", content: "Découvrez et utilisez les avantages liés à votre adhésion La PaDI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BenefitsPage,
});

type Benefit = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  access_conditions: string | null;
  link_url: string | null;
  status: string;
  position: number;
  target_categories: string[];
  target_membership_types: string[];
  target_statuses: string[];
  target_cities: string[];
  target_countries: string[];
};

type Usage = {
  id: string;
  benefit_id: string;
  user_id: string;
  note: string | null;
  rating: number | null;
  feedback: string | null;
  used_at: string;
};

type Profile = {
  category: string | null;
  membership_type: string | null;
  status: string | null;
  city: string | null;
  country: string | null;
};

const CATEGORIES = ["Général", "Formation", "Événement", "Réseau", "Financier", "Santé", "Juridique"];
const STATUSES = ["Actif", "Inactif"];

const emptyBenefit: Omit<Benefit, "id"> = {
  title: "",
  description: "",
  category: "Général",
  access_conditions: "",
  link_url: "",
  status: "Actif",
  position: 0,
  target_categories: [],
  target_membership_types: [],
  target_statuses: [],
  target_cities: [],
  target_countries: [],
};

function parseList(v: string): string[] {
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

function matches(list: string[], value: string | null | undefined) {
  if (!list || list.length === 0) return true;
  if (!value) return false;
  return list.some((v) => v.toLowerCase() === value.toLowerCase());
}

function BenefitsPage() {
  const { user, role } = useAuth();
  const isAdmin = role === "admin";
  const [items, setItems] = useState<Benefit[]>([]);
  const [usages, setUsages] = useState<Usage[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Benefit | null>(null);
  const [form, setForm] = useState<Omit<Benefit, "id">>(emptyBenefit);
  const [useTarget, setUseTarget] = useState<Benefit | null>(null);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("");
  const [q, setQ] = useState("");
  const [fCat, setFCat] = useState("");
  const [fStatus, setFStatus] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    const [{ data: bs }, { data: us }, { data: pr }] = await Promise.all([
      supabase.from("benefits").select("*").order("position", { ascending: true }).order("created_at", { ascending: false }),
      supabase.from("benefit_usage").select("*").order("used_at", { ascending: false }),
      user?.id
        ? supabase.from("profiles").select("category,membership_type,status,city,country").eq("id", user.id).maybeSingle()
        : Promise.resolve({ data: null } as { data: Profile | null }),
    ]);
    setItems((bs as Benefit[]) ?? []);
    setUsages((us as Usage[]) ?? []);
    setProfile((pr as Profile | null) ?? null);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  const eligible = useMemo(() => {
    if (isAdmin) return items;
    return items.filter(
      (b) =>
        b.status === "Actif" &&
        matches(b.target_categories, profile?.category) &&
        matches(b.target_membership_types, profile?.membership_type) &&
        matches(b.target_statuses, profile?.status) &&
        matches(b.target_cities, profile?.city) &&
        matches(b.target_countries, profile?.country),
    );
  }, [items, isAdmin, profile]);

  const filtered = useMemo(
    () =>
      eligible.filter(
        (b) =>
          (!q || `${b.title} ${b.description ?? ""}`.toLowerCase().includes(q.toLowerCase())) &&
          (!fCat || b.category === fCat) &&
          (!fStatus || b.status === fStatus),
      ),
    [eligible, q, fCat, fStatus],
  );

  const myUsages = useMemo(() => usages.filter((u) => u.user_id === user?.id), [usages, user?.id]);
  const statsFor = useCallback(
    (benefitId: string) => {
      const rows = usages.filter((u) => u.benefit_id === benefitId);
      const rated = rows.filter((r) => r.rating != null);
      const avg = rated.length ? rated.reduce((s, r) => s + (r.rating ?? 0), 0) / rated.length : null;
      return { count: rows.length, avg };
    },
    [usages],
  );

  function openCreate() {
    setEditing(null);
    setForm(emptyBenefit);
    setOpen(true);
  }
  function openEdit(b: Benefit) {
    setEditing(b);
    const { id: _id, ...rest } = b;
    setForm(rest);
    setOpen(true);
  }

  async function save() {
    if (!form.title.trim()) return toast.error("Le titre est obligatoire.");
    const payload = { ...form, position: Number(form.position) || 0 };
    const { error } = editing
      ? await supabase.from("benefits").update(payload).eq("id", editing.id)
      : await supabase.from("benefits").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Avantage mis à jour." : "Avantage créé.");
    setOpen(false);
    refresh();
  }

  async function remove(b: Benefit) {
    if (!confirm(`Supprimer l'avantage « ${b.title} » ?`)) return;
    const { error } = await supabase.from("benefits").delete().eq("id", b.id);
    if (error) return toast.error(error.message);
    toast.success("Avantage supprimé.");
    refresh();
  }

  async function confirmUsage() {
    if (!useTarget || !user?.id) return;
    const { error } = await supabase.from("benefit_usage").insert({
      benefit_id: useTarget.id,
      user_id: user.id,
      rating,
      feedback: feedback.trim() || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Utilisation enregistrée. Merci pour votre retour !");
    setUseTarget(null);
    setRating(5);
    setFeedback("");
    refresh();
  }

  return (
    <div className="max-w-[1200px] mx-auto">
      <PageHeader
        icon={<Gift className="h-6 w-6" />}
        eyebrow="Adhésion"
        title={isAdmin ? "Avantages membres" : "Mes avantages"}
        subtitle={
          isAdmin
            ? "Créez et ciblez les avantages, suivez leur utilisation et la satisfaction des membres."
            : "Les avantages auxquels votre adhésion vous donne droit, leurs conditions et votre historique d'utilisation."
        }
        action={isAdmin ? <PrimaryBtn onClick={openCreate}>Nouvel avantage</PrimaryBtn> : undefined}
      />

      <Card className="mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un avantage…" className={inputCls + " pl-9"} />
          </div>
          <select value={fCat} onChange={(e) => setFCat(e.target.value)} className={inputCls}>
            <option value="">Toutes les catégories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {isAdmin ? (
            <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className={inputCls}>
              <option value="">Tous les statuts</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          ) : (
            <div className="flex items-center text-sm text-muted-foreground px-1">
              {filtered.length} avantage{filtered.length > 1 ? "s" : ""} disponible{filtered.length > 1 ? "s" : ""}
            </div>
          )}
        </div>
      </Card>

      {loading ? (
        <Card><p className="text-sm text-muted-foreground">Chargement…</p></Card>
      ) : filtered.length === 0 ? (
        <Card>
          <div className="py-10 flex flex-col items-center justify-center text-center text-muted-foreground">
            <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center mb-3"><Inbox className="h-5 w-5" /></div>
            <p className="text-sm">{isAdmin ? "Aucun avantage enregistré." : "Aucun avantage ne correspond à votre profil pour le moment."}</p>
          </div>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((b) => {
            const st = statsFor(b.id);
            const mine = myUsages.filter((u) => u.benefit_id === b.id);
            return (
              <Card key={b.id} className="flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary">{b.category}</span>
                    <h3 className="font-display font-bold text-base mt-0.5">{b.title}</h3>
                  </div>
                  {isAdmin && (
                    <span className={"text-[11px] px-2 py-0.5 rounded-full shrink-0 " + (b.status === "Actif" ? "bg-primary-soft text-primary" : "bg-secondary text-muted-foreground")}>{b.status}</span>
                  )}
                </div>
                {b.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{b.description}</p>}
                {b.access_conditions && (
                  <p className="text-xs text-muted-foreground mt-3 rounded-lg bg-secondary px-3 py-2">
                    <span className="font-semibold">Conditions : </span>{b.access_conditions}
                  </p>
                )}
                {isAdmin && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Ciblage : {[
                      b.target_categories.join(", "),
                      b.target_membership_types.join(", "),
                      b.target_statuses.join(", "),
                      b.target_cities.join(", "),
                      b.target_countries.join(", "),
                    ].filter(Boolean).join(" · ") || "Tous les membres"}
                  </p>
                )}
                <div className="mt-3 text-xs text-muted-foreground flex items-center gap-3">
                  <span>{st.count} utilisation{st.count > 1 ? "s" : ""}</span>
                  {st.avg != null && (
                    <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 text-primary" /> {st.avg.toFixed(1)}/5</span>
                  )}
                </div>
                <div className="mt-4 pt-3 border-t border-border flex items-center gap-2 flex-wrap">
                  {b.link_url && (
                    <a href={b.link_url} target="_blank" rel="noreferrer" className="h-9 px-3 rounded-full border border-border text-sm font-medium inline-flex items-center gap-1.5 hover:bg-secondary">
                      <ExternalLink className="h-4 w-4" /> Accéder
                    </a>
                  )}
                  {!isAdmin && (
                    <button onClick={() => { setUseTarget(b); setRating(5); setFeedback(""); }} className="h-9 px-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-primary/90">
                      <CheckCircle2 className="h-4 w-4" /> J'ai utilisé
                    </button>
                  )}
                  {!isAdmin && mine.length > 0 && (
                    <span className="text-xs text-muted-foreground">Utilisé {mine.length} fois</span>
                  )}
                  {isAdmin && (
                    <>
                      <button onClick={() => openEdit(b)} className="h-9 w-9 rounded-full border border-border inline-flex items-center justify-center hover:bg-secondary"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => remove(b)} className="h-9 w-9 rounded-full border border-border inline-flex items-center justify-center hover:bg-secondary text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Historique */}
      <div className="mt-6">
        <h2 className="font-display font-bold text-lg mb-3">{isAdmin ? "Historique d'utilisation (tous les membres)" : "Mon historique d'utilisation"}</h2>
        <Card>
          {(isAdmin ? usages : myUsages).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune utilisation enregistrée.</p>
          ) : (
            <div className="divide-y divide-border">
              {(isAdmin ? usages : myUsages).slice(0, 50).map((u) => {
                const b = items.find((i) => i.id === u.benefit_id);
                return (
                  <div key={u.id} className="py-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span className="font-semibold">{b?.title ?? "Avantage supprimé"}</span>
                    <span className="text-muted-foreground">{new Date(u.used_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</span>
                    {u.rating != null && <span className="inline-flex items-center gap-1 text-muted-foreground"><Star className="h-3.5 w-3.5 text-primary" />{u.rating}/5</span>}
                    {u.feedback && <span className="text-muted-foreground italic w-full sm:w-auto">« {u.feedback} »</span>}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Modale admin */}
      <AdminModal open={open} onClose={() => setOpen(false)} title={editing ? "Modifier l'avantage" : "Nouvel avantage"}>
        <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
          <Field label="Titre"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} /></Field>
          <Field label="Description">
            <textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className={inputCls.replace("h-10", "h-auto py-2")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Catégorie">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Statut">
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Conditions d'accès">
            <input value={form.access_conditions ?? ""} onChange={(e) => setForm({ ...form, access_conditions: e.target.value })} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Lien"><input value={form.link_url ?? ""} onChange={(e) => setForm({ ...form, link_url: e.target.value })} className={inputCls} placeholder="https://" /></Field>
            <Field label="Ordre d'affichage"><input type="number" value={form.position} onChange={(e) => setForm({ ...form, position: Number(e.target.value) })} className={inputCls} /></Field>
          </div>
          <Field label="Catégories ciblées (vide = toutes)">
            <input value={form.target_categories.join(", ")} onChange={(e) => setForm({ ...form, target_categories: parseList(e.target.value) })} className={inputCls} placeholder="Ambassadeur du Développement, Sympathisant" />
          </Field>
          <Field label="Types d'adhésion ciblés">
            <input value={form.target_membership_types.join(", ")} onChange={(e) => setForm({ ...form, target_membership_types: parseList(e.target.value) })} className={inputCls} placeholder="Classique, Liberté Financière" />
          </Field>
          <Field label="Statuts ciblés">
            <input value={form.target_statuses.join(", ")} onChange={(e) => setForm({ ...form, target_statuses: parseList(e.target.value) })} className={inputCls} placeholder="Actif" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Villes ciblées"><input value={form.target_cities.join(", ")} onChange={(e) => setForm({ ...form, target_cities: parseList(e.target.value) })} className={inputCls} /></Field>
            <Field label="Pays ciblés"><input value={form.target_countries.join(", ")} onChange={(e) => setForm({ ...form, target_countries: parseList(e.target.value) })} className={inputCls} /></Field>
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className="h-10 px-4 rounded-full border border-border text-sm font-medium hover:bg-secondary">Annuler</button>
            <PrimaryBtn onClick={save}>Enregistrer</PrimaryBtn>
          </div>
        </div>
      </AdminModal>

      {/* Modale utilisation membre */}
      <AdminModal open={!!useTarget} onClose={() => setUseTarget(null)} title={`Utilisation — ${useTarget?.title ?? ""}`}>
        <div className="space-y-4">
          <Field label="Votre satisfaction">
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} aria-label={`${n} étoile${n > 1 ? "s" : ""}`} className="h-9 w-9 rounded-full inline-flex items-center justify-center hover:bg-secondary">
                  <Star className={"h-5 w-5 " + (n <= rating ? "fill-primary text-primary" : "text-muted-foreground")} />
                </button>
              ))}
            </div>
          </Field>
          <Field label="Commentaire (optionnel)">
            <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={3} className={inputCls.replace("h-10", "h-auto py-2")} />
          </Field>
          <div className="flex justify-end gap-2">
            <button onClick={() => setUseTarget(null)} className="h-10 px-4 rounded-full border border-border text-sm font-medium hover:bg-secondary">Annuler</button>
            <PrimaryBtn onClick={confirmUsage}>Enregistrer</PrimaryBtn>
          </div>
        </div>
      </AdminModal>
    </div>
  );
}
