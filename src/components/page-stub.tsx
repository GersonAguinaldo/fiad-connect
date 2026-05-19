import { Link } from "@tanstack/react-router";

export function PageHeader({ icon, eyebrow, title, subtitle, action }: { icon?: React.ReactNode; eyebrow?: string; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
      <div className="flex items-center gap-4">
        {icon && <div className="h-14 w-14 rounded-2xl bg-primary-soft text-primary flex items-center justify-center">{icon}</div>}
        <div>
          {eyebrow && <div className="text-sm text-muted-foreground">{eyebrow}</div>}
          <h1 className="text-2xl font-display font-extrabold">{title}</h1>
          {subtitle && <div className="text-sm text-muted-foreground mt-1">{subtitle}</div>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={"bg-card rounded-2xl border border-border p-6 shadow-[var(--shadow-card)] " + className}>{children}</div>;
}

export function PrimaryBtn({ children }: { children: React.ReactNode }) {
  return <button className="h-10 px-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 shadow-[var(--shadow-card)]">{children}</button>;
}

export { Link };