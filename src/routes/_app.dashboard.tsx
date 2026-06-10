import { Avatar } from "@/components/avatar";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Inbox,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Tableau de bord — La PaDI" }] }),
  component: DashboardPage,
});

type Tx = {
  id: string;
  user_id: string;
  reason: string;
  amount: number;
  currency: string;
  method: string | null;
  status: string;
  occurred_at: string;
  member_name?: string;
};
type Ev = { id: string; title: string; event_date: string; location: string | null };
type Member = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  city: string | null;
  country: string | null;
  category: string;
  created_at: string;
};

function DashboardPage() {
  const { user } = useAuth();
  const [memberCount, setMemberCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [weekJoins, setWeekJoins] = useState(0);
  const [monthSum, setMonthSum] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [events, setEvents] = useState<Ev[]>([]);
  const [newMembers, setNewMembers] = useState<Member[]>([]);

  useEffect(() => {
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const now = new Date().toISOString();

    (async () => {
      const [
        { count: total },
        { count: pending },
        { count: week },
        { data: txData },
        { data: evData },
        { count: upc },
        { data: nm },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("status", "En attente"),
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .gte("created_at", weekAgo),
        supabase
          .from("transactions")
          .select("id,user_id,reason,amount,currency,method,status,occurred_at")
          .order("occurred_at", { ascending: false })
          .limit(5),
        supabase
          .from("events")
          .select("id,title,event_date,location")
          .gte("event_date", now)
          .order("event_date", { ascending: true })
          .limit(4),
        supabase.from("events").select("*", { count: "exact", head: true }).gte("event_date", now),
        supabase
          .from("profiles")
          .select("id,first_name,last_name,city,country,category,created_at")
          .order("created_at", { ascending: false })
          .limit(4),
      ]);
      setMemberCount(total ?? 0);
      setPendingCount(pending ?? 0);
      setWeekJoins(week ?? 0);
      setUpcomingCount(upc ?? 0);
      setEvents((evData as Ev[]) ?? []);
      setNewMembers((nm as Member[]) ?? []);

      const { data: monthTx } = await supabase
        .from("transactions")
        .select("amount,status")
        .gte("occurred_at", monthStart)
        .eq("status", "Réussi");
      setMonthSum(
        (monthTx ?? []).reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0),
      );

      if (txData && txData.length) {
        const ids = Array.from(new Set(txData.map((t) => t.user_id)));
        const { data: profs } = await supabase
          .from("profiles")
          .select("id,first_name,last_name")
          .in("id", ids);
        const nameById = new Map(
          (profs ?? []).map((p) => [
            p.id,
            [p.first_name, p.last_name].filter(Boolean).join(" ") || "Membre",
          ]),
        );
        setTxs(txData.map((t) => ({ ...t, member_name: nameById.get(t.user_id) ?? "Membre" })));
      } else setTxs([]);
    })();
  }, []);

  const firstName = user?.user_metadata?.first_name ?? "Ambassadeur";
  const fmtMoney = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 sm:space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3 sm:gap-4">
        <div>
          <div className="text-xs sm:text-sm text-muted-foreground">Tableau de bord</div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold mt-1">Bonjour, {firstName}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Voici l'activité de l'association.</p>
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-to-r from-primary to-[oklch(0.45_0.22_265)] text-primary-foreground p-4 sm:p-6 shadow-[var(--shadow-elevated)]">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 sm:gap-6">
          <Kpi label="Membres" value={String(memberCount)} />
          <Kpi label="En attente" value={String(pendingCount)} />
          <Kpi label="Inscriptions (7j)" value={String(weekJoins)} />
          <Kpi label="Paiements (mois)" value={fmtMoney(monthSum)} />
          <Kpi label="Événements à venir" value={String(upcomingCount)} />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={Users}
          label="Membres"
          value={String(memberCount)}
          tone="oklch(0.55 0.22 255)"
        />
        <StatCard
          icon={GraduationCap}
          label="Inscriptions (7j)"
          value={String(weekJoins)}
          tone="oklch(0.7 0.16 165)"
        />
        <StatCard
          icon={CalendarDays}
          label="Événements à venir"
          value={String(upcomingCount)}
          tone="oklch(0.75 0.15 75)"
        />
        <StatCard
          icon={Wallet}
          label="Encaissé (mois)"
          value={fmtMoney(monthSum)}
          tone="oklch(0.6 0.22 295)"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-4 sm:p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-bold">Activité récente</h2>
            <Link
              to="/finances"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              Voir tout <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {txs.length === 0 ? (
            <EmptyState label="Aucune transaction enregistrée." />
          ) : (
            <div className="divide-y divide-border">
              {txs.map((t) => (
                <div key={t.id} className="py-3 flex items-center gap-4">
                  <StatusDot status={t.status} />
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{t.member_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.reason}
                      {t.method ? ` • ${t.method}` : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold tabular-nums">
                      {new Intl.NumberFormat("fr-FR").format(Number(t.amount))} {t.currency}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(t.occurred_at).toLocaleDateString("fr-FR")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-bold">Prochains événements</h2>
            <Link to="/evenements" className="text-sm text-primary hover:underline">
              Tout voir
            </Link>
          </div>
          {events.length === 0 ? (
            <EmptyState label="Aucun événement programmé." />
          ) : (
            <ul className="space-y-3">
              {events.map((e) => {
                const d = new Date(e.event_date);
                return (
                  <li
                    key={e.id}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-secondary transition"
                  >
                    <div className="h-12 w-12 rounded-xl bg-primary-soft text-primary flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] uppercase font-bold">
                        {d.toLocaleString("fr", { month: "short" })}
                      </span>
                      <span className="text-base font-bold leading-none">{d.getDate()}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm truncate">{e.title}</div>
                      <div className="text-xs text-muted-foreground">{e.location ?? "—"}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-bold">Nouveaux membres</h2>
          <Link to="/membres" className="text-sm text-primary hover:underline">
            Tous les membres
          </Link>
        </div>
        {newMembers.length === 0 ? (
          <EmptyState label="Aucun membre inscrit pour l'instant." />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {newMembers.map((m) => {
              const name = [m.first_name, m.last_name].filter(Boolean).join(" ") || "Membre";
              return (
                <Link
                  key={m.id}
                  to="/membres/$memberId"
                  params={{ memberId: m.id }}
                  className="p-4 rounded-xl border border-border hover:border-primary hover:bg-primary-soft/50 transition"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={name} />
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{name}</div>
                      <div className="text-xs text-muted-foreground">
                        {[m.city, m.country].filter(Boolean).join(", ") || "—"}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs inline-flex px-2 py-0.5 rounded-full bg-primary-soft text-primary font-medium">
                    {m.category}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider opacity-80">{label}</div>
      <div className="text-2xl font-display font-extrabold mt-1">{value}</div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <div
          className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `color-mix(in oklab, ${tone} 15%, white)`, color: tone }}
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>
      <div className="mt-3 sm:mt-4 text-lg sm:text-2xl font-display font-extrabold break-words leading-tight">{value}</div>
      <div className="text-xs sm:text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const map: Record<string, { Icon: typeof CheckCircle2; color: string }> = {
    Réussi: { Icon: CheckCircle2, color: "var(--color-success)" },
    "En attente": { Icon: Clock3, color: "var(--color-warning)" },
    Échoué: { Icon: XCircle, color: "var(--destructive)" },
  };
  const { Icon, color } = map[status] ?? map["En attente"];
  return (
    <div
      className="h-9 w-9 rounded-full flex items-center justify-center"
      style={{ backgroundColor: `color-mix(in oklab, ${color} 15%, white)`, color }}
    >
      <Icon className="h-4 w-4" />
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="py-10 flex flex-col items-center justify-center text-center text-muted-foreground">
      <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center mb-3">
        <Inbox className="h-5 w-5" />
      </div>
      <p className="text-sm">{label}</p>
    </div>
  );
}
