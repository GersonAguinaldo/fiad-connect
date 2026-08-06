import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, UserRound, Settings } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function UserMenu() {
  const { user, role, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const meta = (user?.user_metadata ?? {}) as { first_name?: string; last_name?: string };
  const name = [meta.first_name, meta.last_name].filter(Boolean).join(" ") || user?.email || "Membre";
  const initials =
    `${(meta.first_name?.[0] ?? "").toUpperCase()}${(meta.last_name?.[0] ?? "").toUpperCase()}` ||
    user?.email?.[0]?.toUpperCase() ||
    "FM";

  async function handleLogout() {
    setOpen(false);
    await signOut();
    navigate({ to: "/login" });
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Mon compte"
        className="h-9 w-9 rounded-full bg-gradient-to-br from-[oklch(0.7_0.15_280)] to-primary flex items-center justify-center text-primary-foreground text-sm font-semibold hover:opacity-90"
      >
        {initials}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-60 rounded-xl border border-border bg-card shadow-[var(--shadow-elevated)] overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-border">
            <div className="text-sm font-semibold truncate">{name}</div>
            <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
            <div className="mt-1 inline-block text-[11px] px-2 py-0.5 rounded-full bg-primary-soft text-primary font-medium">
              {role === "admin" ? "Administrateur" : "Membre"}
            </div>
          </div>
          <div className="py-1">
            <Link
              to="/mon-profil"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-secondary transition"
            >
              <UserRound className="h-4 w-4 text-muted-foreground" /> Mon profil
            </Link>
            {role === "admin" && (
              <Link
                to="/parametres"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-secondary transition"
              >
                <Settings className="h-4 w-4 text-muted-foreground" /> Paramètres
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-secondary transition"
            >
              <LogOut className="h-4 w-4" /> Se déconnecter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}