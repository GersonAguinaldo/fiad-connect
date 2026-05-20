import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar } from "@/components/avatar";
import { Card, PageHeader, PrimaryBtn } from "@/components/page-stub";
import { Mail, Phone, MapPin, Calendar } from "lucide-react";

export const Route = createFileRoute("/_app/membres/$memberId")({
  component: MemberDetail,
  notFoundComponent: () => <div className="p-8">Membre introuvable. <Link to="/membres" className="text-primary">Retour</Link></div>,
});

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  category: string;
  status: string;
  created_at: string;
};

function MemberDetail() {
  const { memberId } = Route.useParams() as { memberId: string };
  const [m, setM] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("profiles").select("*").eq("id", memberId).maybeSingle().then(({ data }) => {
      setM(data as Profile | null);
      setLoading(false);
    });
  }, [memberId]);

  if (loading) return <div className="p-8 text-muted-foreground">Chargement…</div>;
  if (!m) return <div className="p-8">Membre introuvable. <Link to="/membres" className="text-primary">Retour</Link></div>;

  const name = [m.first_name, m.last_name].filter(Boolean).join(" ") || m.email || "Membre";

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow="Membre"
        title={name}
        subtitle={`Adhérent depuis le ${new Date(m.created_at).toLocaleDateString("fr-FR")}`}
        icon={<Avatar name={name} />}
        action={<div className="flex gap-2"><PrimaryBtn>+ Nouvelle action</PrimaryBtn></div>}
      />
      <div className="grid lg:grid-cols-3 gap-6">
        <Card>
          <h2 className="text-sm font-display font-bold uppercase tracking-wider text-muted-foreground mb-4">À propos</h2>
          <Info icon={<Mail className="h-4 w-4" />} label="Email" value={m.email ?? "—"} />
          <Info icon={<Phone className="h-4 w-4" />} label="Téléphone" value={m.phone ?? "—"} />
          <Info icon={<MapPin className="h-4 w-4" />} label="Localisation" value={[m.city, m.country].filter(Boolean).join(", ") || "—"} />
          <Info icon={<Calendar className="h-4 w-4" />} label="Adhésion" value={new Date(m.created_at).toLocaleDateString("fr-FR")} />
        </Card>
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-bold">Statut</h2>
            <span className="text-xs px-2.5 py-1 rounded-full bg-primary-soft text-primary font-semibold">{m.category}</span>
          </div>
          <p className="text-sm text-muted-foreground">Statut courant : <span className="font-medium text-foreground">{m.status}</span></p>
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
