import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  GraduationCap,
  CalendarDays,
  MessageSquare,
  Wallet,
  Award,
  ChevronRight,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/mon-espace")({
  head: () => ({ meta: [{ title: "Mon espace — FIAD-Monde" }] }),
  component: MemberDashboard,
});

type Profile = {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  city: string | null;
  country: string | null;
  category: string;
  status: string;
  created_at: string;
};

type Upcoming = { id: string; title: string; event_date: string; tag: string };

function MemberDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [formationsCount, setFormationsCount] = useState(0);
  const [eventsCount, setEventsCount] = useState(0);
  const [upcoming, setUpcoming] = useState<Upcoming[]>([]);
  const [cotisation, setCotisation] = useState<"À jour" | "À régler" | "—">("—");

  useEffect(() => {
    if (!user?.id) return;
    const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
    const now = new Date().toISOString();
    (async () => {
      const [{ data: prof }, { count: fCount }, { count: eCount }, { data: evs }, { data: tx }] = await Promise.all([
        supabase.from("profiles").select("first_name,last_name,email,city,country,category,status,created_at").eq("id", user.id).maybeSingle(),
        supabase.from("formation_enrollments").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("event_registrations").select("*", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", yearStart),
        supabase.from("events").select("id,title,event_date,type").gte("event_date", now).order("event_date", { ascending: true }).limit(5),
        supabase.from("transactions").select("id").eq("user_id", user.id).eq("status", "Réussi").ilike("reason", "%cotisation%").gte("occurred_at", yearStart).limit(1),
      ]);
      setProfile(prof as Profile | null);
      setFormationsCount(fCount ?? 0);
      setEventsCount(eCount ?? 0);
      setUpcoming(((evs as { id: string; title: string; event_date: string; type: string | null }[]) ?? []).map((e) => ({ id: e.id, title: e.title, event_date: e.event_date, tag: e.type ?? "Événement" })));
      setCotisation((tx ?? []).length > 0 ? "À jour" : "À régler");
    })();
  }, [user?.id]);

  const firstName = profile?.first_name || user?.user_metadata?.first_name || "Ambassadeur";

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      {/* Hero */}
      <section className="rounded-3xl bg-gradient-to-br from-primary to-[oklch(0.45_0.22_265)] p-8 lg:p-10 text-primary-foreground shadow-[var(--shadow-elevated)] relative overflow-hidden">
        <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -right-8 bottom-0 h-40 w-40 rounded-full bg-white/10 blur-xl" />
        <div className="relative">
          <div className="text-sm/none opacity-80">Bonjour</div>
          <h1 className="mt-1 text-4xl font-display font-extrabold">{firstName} 👋</h1>
          <p className="mt-3 max-w-lg text-base/relaxed opacity-90">
            Bienvenue dans votre espace Ambassadeur. Suivez vos formations, événements et engagements.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/formations"
              className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-card text-foreground font-semibold hover:bg-secondary transition"
            >
              <GraduationCap className="h-4 w-4" /> Voir les formations
            </Link>
            <Link
              to="/evenements"
              className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-white/15 backdrop-blur text-primary-foreground font-semibold hover:bg-white/25 transition"
            >
              <CalendarDays className="h-4 w-4" /> Mes événements
            </Link>
          </div>
        </div>
      </section>

      {/* KPI cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Wallet} label="Cotisation" value={cotisation} color="oklch(0.7 0.15 155)" />
        <KpiCard icon={GraduationCap} label="Formations suivies" value={String(formationsCount)} color="oklch(0.6 0.22 258)" />
        <KpiCard icon={CalendarDays} label="Événements (an)" value={String(eventsCount)} color="oklch(0.75 0.15 25)" />
        <KpiCard icon={Award} label="Statut" value={profile?.status ?? "—"} color="oklch(0.6 0.22 295)" />
      </section>

      {/* Main grid */}
      <section className="grid lg:grid-cols-3 gap-5">
        {/* Upcoming */}
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-lg">À venir cette semaine</h2>
            <Link to="/evenements" className="text-sm text-primary font-medium hover:underline">Tout voir</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">Aucun événement à venir.</p>
          ) : (
            <ul className="mt-5 divide-y divide-border">
              {upcoming.map((e) => {
                const d = new Date(e.event_date);
                return (
                  <EventRow
                    key={e.id}
                    date={d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                    time={d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    title={e.title}
                    tag={e.tag}
                  />
                );
              })}
            </ul>
          )}
        </div>

        {/* My status */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-[var(--shadow-card)]">
          <h2 className="font-display font-bold text-lg">Mon statut</h2>
          <div className="mt-5 space-y-3">
            <StatusRow ok={!!(profile?.first_name && profile?.last_name && profile?.country)} label="Profil complété" />
            <StatusRow ok={cotisation === "À jour"} label={`Cotisation ${new Date().getFullYear()} payée`} />
            <StatusRow ok={formationsCount > 0} label="Inscrit à une formation" />
            <StatusRow ok={eventsCount > 0} label="Participation à un événement" />
          </div>
          <Link
            to="/messages"
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <MessageSquare className="h-4 w-4" /> Contacter mon responsable
          </Link>
        </div>
      </section>

      {/* My profile snapshot */}
      <section className="bg-card rounded-2xl border border-border p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-lg">Mes informations</h2>
          <span className="text-xs text-muted-foreground">Membre depuis {profile ? new Date(profile.created_at).toLocaleDateString("fr-FR") : "—"}</span>
        </div>
        <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <Info label="Prénom" value={profile?.first_name} />
          <Info label="Nom" value={profile?.last_name} />
          <Info label="Email" value={profile?.email ?? user?.email} />
          <Info label="Pays" value={profile?.country} />
        </div>
      </section>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color }: { icon: typeof Wallet; label: string; value: string; color: string }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5 shadow-[var(--shadow-card)] flex items-start gap-4">
      <div
        className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `color-mix(in oklab, ${color} 15%, white)`, color }}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
        <div className="mt-1 text-2xl font-display font-extrabold text-foreground">{value}</div>
      </div>
    </div>
  );
}

function EventRow({ date, time, title, tag }: { date: string; time: string; title: string; tag: string }) {
  return (
    <li className="py-3 flex items-center gap-4">
      <div className="w-20 shrink-0">
        <div className="text-xs text-muted-foreground">{date}</div>
        <div className="text-sm font-semibold text-foreground flex items-center gap-1">
          <Clock className="h-3 w-3 text-muted-foreground" /> {time}
        </div>
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <span className="inline-flex mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary-soft text-primary uppercase tracking-wider">
          {tag}
        </span>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </li>
  );
}

function StatusRow({ ok, label }: { ok?: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <CheckCircle2
        className={"h-4 w-4 " + (ok ? "text-[var(--color-success)]" : "text-muted-foreground/40")}
      />
      <span className={ok ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-xl bg-secondary/60 px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold text-foreground mt-0.5">{value || "—"}</div>
    </div>
  );
}