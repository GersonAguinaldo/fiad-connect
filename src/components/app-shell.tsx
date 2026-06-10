import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Search, ShieldCheck, UserRound, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { FiadLogo } from "./fiad-logo";
import { useAuth } from "@/hooks/use-auth";

const ADMIN_NAV = [
  { to: "/dashboard", label: "Vue d'ensemble" },
  { to: "/membres", label: "Membres" },
  { to: "/formations", label: "Formations" },
  { to: "/evenements", label: "Événements" },
  { to: "/calendrier", label: "Calendrier" },
  { to: "/finances", label: "Finances" },
  { to: "/parametres", label: "Parametres" },
  { to: "/messages", label: "Messages" },
  { to: "/rapports", label: "Rapports" },
] as const;

const MEMBER_NAV = [
  { to: "/mon-espace", label: "Mon espace" },
  { to: "/mon-profil", label: "Mon profil" },
  { to: "/formations", label: "Formations" },
  { to: "/evenements", label: "Événements" },
  { to: "/calendrier", label: "Calendrier" },
  { to: "/mes-finances", label: "Mes finances" },
  { to: "/messages", label: "Messages" },
] as const;

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const isAdmin = role === "admin";
  const NAV = isAdmin ? ADMIN_NAV : MEMBER_NAV;
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { setMenuOpen(false); }, [pathname]);

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
        <div className="flex items-center gap-3 sm:gap-6 px-3 sm:px-6 h-16">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden h-9 w-9 rounded-lg hover:bg-secondary inline-flex items-center justify-center shrink-0"
            aria-label="Menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="shrink-0"><FiadLogo /></div>
          <div className="hidden md:block flex-1 max-w-2xl mx-auto relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Rechercher un membre, un cours, un événement…"
              className="w-full h-10 pl-10 pr-4 rounded-full bg-secondary border border-transparent focus:bg-card focus:border-ring focus:outline-none text-sm transition"
            />
          </div>
          <div className="flex-1 md:hidden" />
          <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
            <button
              onClick={handleLogout}
              title="Se déconnecter"
              className="h-9 w-9 rounded-full bg-gradient-to-br from-[oklch(0.7_0.15_280)] to-primary flex items-center justify-center text-primary-foreground text-sm font-semibold hover:opacity-90"
            >
              {initials}
            </button>
          </div>
        </div>
        {/* App tabs (desktop) */}
        <div className="hidden md:flex px-6 items-center gap-1 border-t border-border/60">
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
        {/* Mobile drawer */}
        {menuOpen && (
          <div className="md:hidden border-t border-border bg-card">
            <div className="px-3 py-2 flex items-center gap-2 border-b border-border/60">
              <div className={"h-7 w-7 rounded-md flex items-center justify-center " + (isAdmin ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary")}>
                {isAdmin ? <ShieldCheck className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
              </div>
              <span className="font-display font-bold text-sm">
                {isAdmin ? "Console Admin" : "Espace Membre"}
              </span>
            </div>
            <div className="px-2 py-2 relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                placeholder="Rechercher…"
                className="w-full h-10 pl-10 pr-3 rounded-lg bg-secondary border border-transparent focus:bg-card focus:border-ring focus:outline-none text-sm"
              />
            </div>
            <nav className="px-2 pb-2 grid grid-cols-2 gap-1.5">
              {NAV.map((item) => {
                const active = pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={
                      "px-3 py-2.5 rounded-lg text-sm font-medium transition-colors " +
                      (active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary")
                    }
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      <main className="px-3 sm:px-6 py-4 sm:py-6">
        <Outlet />
      </main>
    </div>
  );
}

