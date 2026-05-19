import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Bell, HelpCircle, Search, Settings, Star, Plus } from "lucide-react";
import { FiadLogo } from "./fiad-logo";

const NAV = [
  { to: "/dashboard", label: "Accueil" },
  { to: "/membres", label: "Membres" },
  { to: "/formations", label: "Formations" },
  { to: "/evenements", label: "Événements" },
  { to: "/finances", label: "Finances" },
  { to: "/messages", label: "Messages" },
  { to: "/rapports", label: "Rapports" },
] as const;

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

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
            <div className="ml-2 h-9 w-9 rounded-full bg-gradient-to-br from-[oklch(0.7_0.15_280)] to-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
              LA
            </div>
          </div>
        </div>
        {/* App tabs */}
        <div className="px-6 flex items-center gap-1 border-t border-border/60">
          <div className="flex items-center gap-2 pr-6 py-3 mr-2 border-r border-border">
            <div className="h-8 w-8 rounded-md bg-primary-soft flex items-center justify-center">
              <div className="h-4 w-4 grid grid-cols-2 gap-0.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-primary rounded-[1px]" />
                ))}
              </div>
            </div>
            <span className="font-display font-bold text-foreground">Console FIAD</span>
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