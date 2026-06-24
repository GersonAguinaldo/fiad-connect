import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UserRound, Save, Camera, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, PageHeader, PrimaryBtn } from "@/components/page-stub";
import { Field, inputCls } from "@/components/admin-modal";
import { Avatar } from "@/components/avatar";

export const Route = createFileRoute("/_app/mon-profil")({
  head: () => ({ meta: [{ title: "Mon profil — La PaDI" }] }),
  component: MyProfile,
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
  avatar_url: string | null;
  category: string;
  membership_type: string;
  status: string;
  created_at: string;
};

function MyProfile() {
  const { user } = useAuth();
  const [p, setP] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      setP(data as unknown as Profile);
      setLoading(false);
    });
  }, [user]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!p || !user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: p.first_name,
        last_name: p.last_name,
        phone: p.phone,
        address: p.address,
        city: p.city,
        country: p.country,
        birth_date: p.birth_date,
        birth_place: p.birth_place,
        sex: p.sex,
        avatar_url: p.avatar_url,
      } as never)
      .eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profil mis à jour");
  }

  if (loading) return <div className="p-8 text-muted-foreground">Chargement…</div>;
  if (!p) return <div className="p-8">Profil introuvable.</div>;

  const name = [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "Membre";

  async function uploadAvatar(file: File) {
    if (!user || !p) return;
    if (!file.type.startsWith("image/")) { toast.error("Veuillez choisir une image."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image trop volumineuse (max 5 Mo)."); return; }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) { setUploading(false); toast.error(upErr.message); return; }
    const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 365);
    const url = signed?.signedUrl ?? null;
    const { error: updErr } = await supabase.from("profiles").update({ avatar_url: url } as never).eq("id", user.id);
    setUploading(false);
    if (updErr) { toast.error(updErr.message); return; }
    setP({ ...p, avatar_url: url });
    toast.success("Photo mise à jour");
  }

  return (
    <div className="max-w-[1100px] mx-auto">
      <PageHeader
        eyebrow="Espace Membre"
        title="Mon profil"
        subtitle="Gérez vos informations personnelles et votre adhésion"
        icon={<UserRound className="h-6 w-6" />}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <Card>
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4">
              <Avatar name={name} url={p.avatar_url} size={96} />
              <label className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:opacity-90 shadow">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                <input type="file" accept="image/*" className="hidden" disabled={uploading}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }} />
              </label>
            </div>
            <div className="font-display font-bold text-lg">{name}</div>
            <div className="text-sm text-muted-foreground">{p.email}</div>
            <div className="mt-4 w-full space-y-2 text-sm">
              <RowKV k="Catégorie" v={p.category} />
              <RowKV k="Type d'adhésion" v={p.membership_type} />
              <RowKV k="Statut" v={p.status} />
              <RowKV k="Membre depuis" v={new Date(p.created_at).toLocaleDateString("fr-FR")} />
            </div>
            <p className="text-xs text-muted-foreground mt-4">Ces champs sont gérés par l'administration.</p>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="font-display font-bold text-lg mb-4">Informations personnelles</h2>
          <form onSubmit={save} className="grid sm:grid-cols-2 gap-4">
            <Field label="Prénom"><input className={inputCls} value={p.first_name ?? ""} onChange={(e) => setP({ ...p, first_name: e.target.value })} /></Field>
            <Field label="Nom"><input className={inputCls} value={p.last_name ?? ""} onChange={(e) => setP({ ...p, last_name: e.target.value })} /></Field>
            <Field label="Email"><input disabled className={inputCls + " opacity-60"} value={p.email ?? ""} /></Field>
            <Field label="Téléphone"><input className={inputCls} value={p.phone ?? ""} onChange={(e) => setP({ ...p, phone: e.target.value })} /></Field>
            <Field label="Sexe">
              <select className={inputCls} value={p.sex ?? ""} onChange={(e) => setP({ ...p, sex: e.target.value })}>
                <option value="">—</option>
                <option>Masculin</option>
                <option>Féminin</option>
                <option>Autre</option>
              </select>
            </Field>
            <Field label="Date de naissance"><input type="date" className={inputCls} value={p.birth_date ?? ""} onChange={(e) => setP({ ...p, birth_date: e.target.value })} /></Field>
            <Field label="Lieu de naissance"><input className={inputCls} value={p.birth_place ?? ""} onChange={(e) => setP({ ...p, birth_place: e.target.value })} /></Field>
            <Field label="Adresse"><input className={inputCls} value={p.address ?? ""} onChange={(e) => setP({ ...p, address: e.target.value })} /></Field>
            <Field label="Ville"><input className={inputCls} value={p.city ?? ""} onChange={(e) => setP({ ...p, city: e.target.value })} /></Field>
            <Field label="Pays"><input className={inputCls} value={p.country ?? ""} onChange={(e) => setP({ ...p, country: e.target.value })} /></Field>
            <div className="sm:col-span-2 flex justify-end pt-2">
              <PrimaryBtn type="submit" disabled={saving}><span className="inline-flex items-center gap-2"><Save className="h-4 w-4" /> {saving ? "Enregistrement…" : "Enregistrer"}</span></PrimaryBtn>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

function RowKV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-border last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}
