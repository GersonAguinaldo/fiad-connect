import { Link } from "@tanstack/react-router";

export function FiadLogo({ to = "/dashboard" }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2.5 group">
      <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-[oklch(0.45_0.22_265)] flex items-center justify-center shadow-[var(--shadow-card)]">
        <span className="text-primary-foreground font-display font-extrabold text-lg leading-none">F</span>
        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-[var(--color-success)] ring-2 ring-background" />
      </div>
      <div className="leading-tight">
        <div className="font-display font-extrabold text-primary text-base tracking-tight">FIAD<span className="text-foreground">-Monde</span></div>
        <div className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">Association internationale</div>
      </div>
    </Link>
  );
}