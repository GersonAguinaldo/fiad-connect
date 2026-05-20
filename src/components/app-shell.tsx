import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Bell, HelpCircle, Search, Settings, Star, Plus, ShieldCheck, UserRound } from "lucide-react";
import { FiadLogo } from "./fiad-logo";
import { useAuth } from "@/hooks/use-auth";

const ADMIN_NAV = [
  { to: "/dashboard", label: "Vue d'ensemble" },
  { to: "/membres", label: "Membres" },
  { to: "/formations", label: "Formations" },
  { to: "/evenements", label: "Événements" },
  { to: "/calendrier", label: "Calendrier" },
  { to: "/finances", label: "Finances" },
  { to: "/messages", label: "Messages" },
  { to: "/rapports", label: "Rapports" },
] as const;

const MEMBER_NAV = [
  { to: "/mon-espace", label: "Mon espace" },
  { to: "/mon-profil", label: "Mon profil" },
  { to: "/formations", label: "Formations" },
  { to: "/evenements", label: "Événements" },
  { to: "/calendrier", label: "Calendrier" },
  { to: "/messages", label: "Messages" },
] as const;

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const isAdmin = role === "admin";
  const NAV = isAdmin ? ADMIN_NAV : MEMBER_NAV;

  const meta = (user?.user_metadata ?? {}) as { first_name?: string; last_name?: string };
  const initials =
    `${(meta.first_name?.[0] ?? "").toUpperCase()}${(meta.last_name?.[0] ?? "").toUpperCase()}` ||
    user?.email?.[0]?.toUpperCase() ||
    "FM";

  async function handleLogout() {
    await signOut();
    navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-card border-b border-border">
        <div className="flex items-center gap-6 px-6 h-16">
          <FiadLogo />
          <div className="flex-1 max-w-2xl mx-auto relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Rechercher un membre, un cours, un événement…"
              className="w-full h-10 pl-10 pr-4 rounded-full bg-secondary border border-transparent focus:bg-card focus:border-ring focus:outline-none text-sm transition"
            />
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <IconBtn><Star className="h-4 w-4" /></IconBtn>
            <IconBtn className="text-primary"><Plus className="h-4 w-4" /></IconBtn>
            <IconBtn><HelpCircle className="h-4 w-4" /></IconBtn>
            <IconBtn><Settings className="h-4 w-4" /></IconBtn>
            <IconBtn><Bell className="h-4 w-4" /></IconBtn>
            <button
              onClick={handleLogout}
              title="Se déconnecter"
              className="ml-2 h-9 w-9 rounded-full bg-gradient-to-br from-[oklch(0.7_0.15_280)] to-primary flex items-center justify-center text-primary-foreground text-sm font-semibold hover:opacity-90"
            >
              {initials}
            </button>
          </div>
        </div>
        {/* App tabs */}
        <div className="px-6 flex items-center gap-1 border-t border-border/60">
          <div className="flex items-center gap-2 pr-6 py-3 mr-2 border-r border-border">
            <div className={"h-8 w-8 rounded-md flex items-center justify-center " + (isAdmin ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary")}>
              {isAdmin ? <ShieldCheck className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
            </div>
            <span className="font-display font-bold text-foreground">
              {isAdmin ? "Console Admin" : "Espace Membre"}
            </span>
          </div>
          <nav className="flex items-center gap-1 flex-1 overflow-x-auto">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={
                    "relative px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-colors " +
                    (active
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {item.label}
                  {active && (
                    <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}

function IconBtn({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <button className={"h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-secondary transition " + className}>
      {children}
    </button>
  );
}