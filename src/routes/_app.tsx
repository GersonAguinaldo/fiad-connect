import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";

// Routes accessible only to admins
const ADMIN_ONLY_PREFIXES = ["/dashboard", "/membres", "/finances", "/rapports"];

export const Route = createFileRoute("/_app")({
  component: GuardedShell,
});

function GuardedShell() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (role && role !== "admin") {
      const blocked = ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p));
      if (blocked) navigate({ to: "/mon-espace" });
    }
  }, [user, role, loading, pathname, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen grid place-items-center bg-primary-soft">
        <div className="text-sm text-muted-foreground">Chargement…</div>
      </div>
    );
  }
  return <AppShell />;
}