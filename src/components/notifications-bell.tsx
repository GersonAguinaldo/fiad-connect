import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { AppNotification } from "@/lib/notifications";

const KIND_STYLES: Record<string, string> = {
  statut: "bg-primary-soft text-primary",
  relance: "bg-amber-100 text-amber-700",
  paiement: "bg-emerald-100 text-emerald-700",
  bienvenue: "bg-primary-soft text-primary",
};

export function NotificationsBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setItems((data ?? []) as AppNotification[]);
  }, [user?.id]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 60_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const unread = items.filter((n) => !n.read_at).length;

  async function markAllRead() {
    if (!user?.id || unread === 0) return;
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })));
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
  }

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative h-9 w-9 rounded-full hover:bg-secondary inline-flex items-center justify-center"
      >
        <Bell className="h-4.5 w-4.5 h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold inline-flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl bg-card border border-border shadow-[var(--shadow-elevated)] z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-display font-bold text-foreground">Notifications</span>
            <button
              onClick={markAllRead}
              disabled={unread === 0}
              className="text-xs text-primary font-semibold inline-flex items-center gap-1 disabled:opacity-40"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Tout marquer lu
            </button>
          </div>
          <div className="max-h-[22rem] overflow-y-auto">
            {items.length === 0 && (
              <p className="px-4 py-8 text-sm text-muted-foreground text-center">Aucune notification.</p>
            )}
            {items.map((n) => {
              const content = (
                <>
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        "text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full " +
                        (KIND_STYLES[n.kind] ?? "bg-secondary text-muted-foreground")
                      }
                    >
                      {n.kind}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(n.created_at).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                  <div className="mt-1 text-sm font-medium text-foreground">{n.title}</div>
                  {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                </>
              );
              const cls =
                "block w-full text-left px-4 py-3 border-b border-border/60 last:border-0 hover:bg-secondary/60 transition " +
                (n.read_at ? "" : "bg-primary-soft/40");
              return n.link ? (
                <Link key={n.id} to={n.link} className={cls} onClick={() => setOpen(false)}>
                  {content}
                </Link>
              ) : (
                <div key={n.id} className={cls}>
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}