import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Avatar } from "@/components/avatar";
import { Card, PageHeader, PrimaryBtn } from "@/components/page-stub";
import { Field, inputCls } from "@/components/admin-modal";
import { useAuth } from "@/hooks/use-auth";
import { Mail, Phone, MapPin, Calendar, Trash2, Save, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_app/membres/")({
  component: MemberDetail,
  notFoundComponent: () => <div className="p-8">Membre introuvable. <Link to="/membres" className="text-primary">Retour</Link></div>,
});

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  birth_date: string | null;
  birth_place: string | null;
  sex: string | null;
  category: string;
  membership_type: string;
  status: string;
  created_at: string;
};

const CATEGORIES = ["Ambassadeur du Développement", "Sympathisant", "Ordinaire"];
const TYPES = ["Classique", "Liberté Financière"];
const STATUSES = ["Actif", "Inactif", "Suspendu", "Radié", "En attente"];

function MemberDetail() {
  const { memberId } = Route.useParams();
  const { role } = useAuth();
  const navigate = useNavigate();
  const isAdmin = role === "admin";
  const [m, setM] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("profiles").select("*").eq("id", memberId).maybeSingle().then(({ data }) => {
      setM(data as unknown as Profile);
      setLoading(false);
    });
  }, [memberId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!m) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      first_name: m.first_name, last_name: m.last_name, phone: m.phone,
      address: m.address, city: m.city, country: m.country,
      birth_date: m.birth_date, birth_place: m.birth_place, sex: m.sex,
      category: m.category, membership_type: m.membership_type, status: m.status,
    } as never).eq("id", m.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Membre mis à jour");
  }

  async function remove() {
    if (!m || !confirm("Supprimer ce membre ?")) return;
    const { error } = await supabase.from("profiles").delete().eq("id", m.id);
    if (error) toast.error(error.message);
    else { toast.success("Supprimé"); navigate({ to: "/membres" }); }
  }

  if (loading) return <div className="p-8 text-muted-foreground">Chargement…</div>;
  if (!m) return <div className="p-8">Membre introuvable. <Link to="/membres" className="text-primary">Retour</Link></div>;

  const name = [m.first_name, m.last_name].filter(Boolean).join(" ") || m.email || "Membre";

  return (
    <div className="max-w-[1400px] mx-auto">
      <Link to="/membres" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-3"><ArrowLeft className="h-4 w-4" /> Retour aux membres</Link>
      <PageHeader
        eyebrow="Fiche membre"
        title={name}
        subtitle={`Adhérent depuis le ${new Date(m.created_at).toLocaleDateString("fr-FR")}`}
        icon={<Avatar name={name} />}
        action={isAdmin ? (
          <button onClick={remove} className="h-10 px-4 rounded-full border border-destructive/30 text-destructive text-sm font-semibold hover:bg-destructive/10 inline-flex items-center gap-2"><Trash2 className="h-4 w-4" /> Supprimer</button>
        ) : null}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <Card>
          <h2 className="text-sm font-display font-bold uppercase tracking-wider text-muted-foreground mb-4">Contact</h2>
          <Info icon={<Mail className="h-4 w-4" />} label="Email" value={m.email ?? "—"} />
          <Info icon={<Phone className="h-4 w-4" />} label="Téléphone" value={m.phone ?? "—"} />
          <Info icon={<MapPin className="h-4 w-4" />} label="Localisation" value={[m.address, m.city, m.country].filter(Boolean).join(", ") || "—"} />
          <Info icon={<Calendar className="h-4 w-4" />} label="Né(e) le" value={m.birth_date ? `${new Date(m.birth_date).toLocaleDateString("fr-FR")}${m.birth_place ? " à " + m.birth_place : ""}` : "—"} />
          <div className="mt-4 pt-4 border-t border-border space-y-2 text-sm">
            <RowKV k="Catégorie" v={m.category} />
            <RowKV k="Type d'adhésion" v={m.membership_type} />
            <RowKV k="Statut" v={m.status} />
            <RowKV k="Sexe" v={m.sex ?? "—"} />
          </div>
        </Card>

        <Card className="lg:col-span-2">
          {isAdmin ? (
            <>
              <h2 className="font-display font-bold text-lg mb-4">Modifier la fiche</h2>
              <form onSubmit={save} className="grid sm:grid-cols-2 gap-4">
                <Field label="Prénom"><input className={inputCls} value={m.first_name ?? ""} onChange={(e) => setM({ ...m, first_name: e.target.value })} /></Field>
                <Field label="Nom"><input className={inputCls} value={m.last_name ?? ""} onChange={(e) => setM({ ...m, last_name: e.target.value })} /></Field>
                <Field label="Email"><input disabled className={inputCls + " opacity-60"} value={m.email ?? ""} /></Field>
                <Field label="Téléphone"><input className={inputCls} value={m.phone ?? ""} onChange={(e) => setM({ ...m, phone: e.target.value })} /></Field>
                <Field label="Sexe">
                  <select className={inputCls} value={m.sex ?? ""} onChange={(e) => setM({ ...m, sex: e.target.value })}>
                    <option value="">—</option><option>Masculin</option><option>Féminin</option><option>Autre</option>
                  </select>
                </Field>
                <Field label="Date de naissance"><input type="date" className={inputCls} value={m.birth_date ?? ""} onChange={(e) => setM({ ...m, birth_date: e.target.value })} /></Field>
                <Field label="Lieu de naissance"><input className={inputCls} value={m.birth_place ?? ""} onChange={(e) => setM({ ...m, birth_place: e.target.value })} /></Field>
                <Field label="Adresse"><input className={inputCls} value={m.address ?? ""} onChange={(e) => setM({ ...m, address: e.target.value })} /></Field>
                <Field label="Ville"><input className={inputCls} value={m.city ?? ""} onChange={(e) => setM({ ...m, city: e.target.value })} /></Field>
                <Field label="Pays"><input className={inputCls} value={m.country ?? ""} onChange={(e) => setM({ ...m, country: e.target.value })} /></Field>

                <div className="sm:col-span-2 mt-2 pt-4 border-t border-border">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Adhésion (admin)</div>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <Field label="Catégorie">
                      <select className={inputCls} value={m.category} onChange={(e) => setM({ ...m, category: e.target.value })}>
                        {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </Field>
                    <Field label="Type d'adhésion">
                      <select className={inputCls} value={m.membership_type} onChange={(e) => setM({ ...m, membership_type: e.target.value })}>
                        {TYPES.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </Field>
                    <Field label="Statut">
                      <select className={inputCls} value={m.status} onChange={(e) => setM({ ...m, status: e.target.value })}>
                        {STATUSES.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </Field>
                  </div>
                </div>

                <div className="sm:col-span-2 flex justify-end pt-2">
                  <PrimaryBtn type="submit" disabled={saving}><span className="inline-flex items-center gap-2"><Save className="h-4 w-4" /> {saving ? "Enregistrement…" : "Enregistrer"}</span></PrimaryBtn>
                </div>
              </form>
            </>
          ) : (
            <>
              <h2 className="font-display font-bold text-lg mb-2">À propos</h2>
              <p className="text-sm text-muted-foreground">Profil membre — seuls les administrateurs peuvent modifier cette fiche.</p>
            </>
          )}
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
function RowKV({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span></div>;
}
