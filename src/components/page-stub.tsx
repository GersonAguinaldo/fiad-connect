import { Link } from "@tanstack/react-router";

export function PageHeader({ icon, eyebrow, title, subtitle, action }: { icon?: React.ReactNode; eyebrow?: string; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 mb-5 sm:mb-6 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        {icon && <div className="h-11 w-11 sm:h-14 sm:w-14 rounded-2xl bg-primary-soft text-primary flex items-center justify-center shrink-0">{icon}</div>}
        <div className="min-w-0">
          {eyebrow && <div className="text-xs sm:text-sm text-muted-foreground">{eyebrow}</div>}
          <h1 className="text-xl sm:text-2xl font-display font-extrabold truncate">{title}</h1>
          {subtitle && <div className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 line-clamp-2">{subtitle}</div>}
        </div>
      </div>
      {action && <div className="col-span-2 flex items-center gap-2 flex-wrap sm:col-auto">{action}</div>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={"bg-card rounded-2xl border border-border p-4 sm:p-6 shadow-[var(--shadow-card)] " + className}>{children}</div>;
}

export function PrimaryBtn({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...rest} className={"h-10 px-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 shadow-[var(--shadow-card)] disabled:opacity-60 " + (rest.className ?? "")}>{children}</button>;
}

export { Link };