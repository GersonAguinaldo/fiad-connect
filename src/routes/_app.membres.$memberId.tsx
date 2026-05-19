import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { MEMBERS } from "@/lib/mock-data";
import { Avatar } from "./_app.dashboard";
import { Card, PageHeader, PrimaryBtn } from "@/components/page-stub";
import { Mail, Phone, MapPin, Calendar, CreditCard } from "lucide-react";

export const Route = createFileRoute("/_app/membres/$memberId")({
  component: MemberDetail,
  notFoundComponent: () => <div className="p-8">Membre introuvable. <Link to="/membres" className="text-primary">Retour</Link></div>,
});

function MemberDetail() {
  const { memberId } = Route.useParams();
  const m = MEMBERS.find((x) => x.id === memberId);
  if (!m) throw notFound();

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow="Membre"
        title={m.name}
        subtitle={`${m.id} · Adhérent depuis le ${m.joined}`}
        icon={<Avatar name={m.name} />}
        action={<div className="flex gap-2">
          <button className="h-10 px-4 rounded-full border border-border bg-card text-sm font-medium hover:bg-secondary">Modifier</button>
          <PrimaryBtn>+ Nouvelle action</PrimaryBtn>
        </div>}
      />
      <div className="grid lg:grid-cols-3 gap-6">
        <Card>
          <h2 className="text-sm font-display font-bold uppercase tracking-wider text-muted-foreground mb-4">À propos</h2>
          <Info icon={<Mail className="h-4 w-4" />} label="Email" value={m.email} />
          <Info icon={<Phone className="h-4 w-4" />} label="Téléphone" value="+228 90 00 00 00" />
          <Info icon={<MapPin className="h-4 w-4" />} label="Localisation" value={`${m.city}, ${m.country}`} />
          <Info icon={<Calendar className="h-4 w-4" />} label="Adhésion" value={m.joined} />
          <Info icon={<CreditCard className="h-4 w-4" />} label="Cotisations" value={m.ytdSpending} />
        </Card>
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-bold">Parcours d'engagement</h2>
            <span className="text-xs px-2.5 py-1 rounded-full bg-primary-soft text-primary font-semibold">{m.category}</span>
          </div>
          <ol className="relative border-l-2 border-primary-soft ml-2 space-y-5 pl-6">
            {["Inscription validée", "Paiement de la cotisation", "Premier cours suivi", "Rejoint le groupe local", "Participation au sommet"].map((s, i) => (
              <li key={s} className="relative">
                <span className="absolute -left-[31px] top-1 h-4 w-4 rounded-full bg-primary ring-4 ring-primary-soft" />
                <div className="text-sm font-semibold text-foreground">{s}</div>
                <div className="text-xs text-muted-foreground">Étape {i + 1}</div>
              </li>
            ))}
          </ol>
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