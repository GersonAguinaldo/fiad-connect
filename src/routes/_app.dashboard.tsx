import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Users, GraduationCap, CalendarDays, Wallet, CheckCircle2, Clock3, XCircle } from "lucide-react";
import { MEMBERS, EVENTS, TRANSACTIONS } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Tableau de bord — FIAD-Monde" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-sm text-muted-foreground">Tableau de bord</div>
          <h1 className="text-3xl font-display font-extrabold mt-1">Bonjour, Latévi 👋</h1>
          <p className="text-sm text-muted-foreground mt-1">Voici l'activité de l'association cette semaine.</p>
        </div>
        <div className="flex gap-2">
          <button className="h-10 px-4 rounded-full bg-card border border-border text-sm font-medium hover:bg-secondary">Exporter</button>
          <button className="h-10 px-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 shadow-[var(--shadow-card)]">+ Nouveau membre</button>
        </div>
      </div>

      {/* KPI banner */}
      <div className="rounded-2xl bg-gradient-to-r from-primary to-[oklch(0.45_0.22_265)] text-primary-foreground p-6 shadow-[var(--shadow-elevated)]">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <Kpi label="Membres actifs" value="1 248" trend="+8.4%" />
          <Kpi label="En attente" value="32" trend="+4" />
          <Kpi label="Inscriptions cette semaine" value="47" trend="+12%" />
          <Kpi label="Paiements (mois)" value="3.8M FCFA" trend="+18%" />
          <Kpi label="Événements à venir" value="7" trend="2 cette sem." />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Membres" value="1 248" delta="+8.4% ce mois" tone="oklch(0.55 0.22 255)" />
        <StatCard icon={GraduationCap} label="Apprenants actifs" value="639" delta="+12% ce mois" tone="oklch(0.7 0.16 165)" />
        <StatCard icon={CalendarDays} label="Participants événements" value="922" delta="2 événements cette semaine" tone="oklch(0.75 0.15 75)" />
        <StatCard icon={Wallet} label="Cotisations encaissées" value="3.8M FCFA" delta="+18% vs mois dernier" tone="oklch(0.6 0.22 295)" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Activity */}
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-bold">Activité récente</h2>
            <Link to="/finances" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
              Voir tout <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {TRANSACTIONS.map((t) => (
              <div key={t.id} className="py-3 flex items-center gap-4">
                <StatusDot status={t.status} />
                <div className="flex-1">
                  <div className="font-medium text-foreground">{t.member}</div>
                  <div className="text-xs text-muted-foreground">{t.reason} • {t.method}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold tabular-nums">{t.amount}</div>
                  <div className="text-xs text-muted-foreground">{t.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming events */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-bold">Prochains événements</h2>
            <Link to="/evenements" className="text-sm text-primary hover:underline">Tout voir</Link>
          </div>
          <ul className="space-y-3">
            {EVENTS.map((e) => {
              const d = new Date(e.date);
              return (
                <li key={e.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-secondary transition">
                  <div className="h-12 w-12 rounded-xl bg-primary-soft text-primary flex flex-col items-center justify-center shrink-0">
                    <span className="text-[10px] uppercase font-bold">{d.toLocaleString("fr", { month: "short" })}</span>
                    <span className="text-base font-bold leading-none">{d.getDate()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm truncate">{e.title}</div>
                    <div className="text-xs text-muted-foreground">{e.location}</div>
                    <div className="text-xs text-primary mt-0.5">{e.registrations} inscrits</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* New members preview */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-bold">Nouveaux membres</h2>
          <Link to="/membres" className="text-sm text-primary hover:underline">Tous les membres</Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {MEMBERS.slice(0, 4).map((m) => (
            <Link
              key={m.id}
              to="/membres/$memberId"
              params={{ memberId: m.id }}
              className="p-4 rounded-xl border border-border hover:border-primary hover:bg-primary-soft/50 transition"
            >
              <div className="flex items-center gap-3">
                <Avatar name={m.name} />
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.city}, {m.country}</div>
                </div>
              </div>
              <div className="mt-3 text-xs inline-flex px-2 py-0.5 rounded-full bg-primary-soft text-primary font-medium">
                {m.category}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, trend }: { label: string; value: string; trend: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider opacity-80">{label}</div>
      <div className="text-2xl font-display font-extrabold mt-1">{value}</div>
      <div className="text-xs opacity-90 mt-0.5">{trend}</div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, delta, tone }: { icon: typeof Users; label: string; value: string; delta: string; tone: string }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `color-mix(in oklab, ${tone} 15%, white)`, color: tone }}>
          <Icon className="h-5 w-5" />
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-4 text-2xl font-display font-extrabold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-xs text-[var(--color-success)] mt-1 font-medium">{delta}</div>
    </div>
  );
}

function StatusDot({ status }: { status: "Réussi" | "En attente" | "Échoué" }) {
  const map = {
    "Réussi": { Icon: CheckCircle2, color: "var(--color-success)" },
    "En attente": { Icon: Clock3, color: "var(--color-warning)" },
    "Échoué": { Icon: XCircle, color: "var(--destructive)" },
  } as const;
  const { Icon, color } = map[status];
  return (
    <div className="h-9 w-9 rounded-full flex items-center justify-center" style={{ backgroundColor: `color-mix(in oklab, ${color} 15%, white)`, color }}>
      <Icon className="h-4 w-4" />
    </div>
  );
}

export function Avatar({ name }: { name: string }) {
  const init = name.split(" ").map((p) => p[0]).slice(0, 2).join("");
  const hues = [255, 165, 75, 295, 25, 195];
  const hue = hues[name.charCodeAt(0) % hues.length];
  return (
    <div className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
      style={{ background: `linear-gradient(135deg, oklch(0.65 0.18 ${hue}), oklch(0.45 0.2 ${hue + 20}))` }}>
      {init}
    </div>
  );
}