import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  getCurrentUser,
  onAuthChange,
  signOut as backendSignOut,
  type AppRole,
  type AppUser,
} from "@/lib/auth-backend";
import type { AdminPermissions } from "@/lib/permissions";
import { canAccessPath } from "@/lib/permissions";

export type { AppRole } from "@/lib/auth-backend";

type AuthCtx = {
  user: AppUser | null;
  role: AppRole | null;
  permissions: AdminPermissions | null;
  isSuperAdmin: boolean;
  can: (pathname: string) => boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  role: null,
  permissions: null,
  isSuperAdmin: false,
  can: () => false,
  loading: true,
  refresh: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [permissions, setPermissions] = useState<AdminPermissions | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const current = await getCurrentUser();
      setUser(current?.user ?? null);
      setRole(current?.role ?? null);
      if (current?.user && current.role === "admin") {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data } = await supabase
          .from("admin_permissions")
          .select("user_id, is_super_admin, modules, cities, countries")
          .eq("user_id", current.user.id)
          .maybeSingle();
        setPermissions((data as AdminPermissions | null) ?? null);
      } else {
        setPermissions(null);
      }
    } catch {
      setUser(null);
      setRole(null);
      setPermissions(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    return onAuthChange(() => {
      void refresh();
    });
  }, [refresh]);

  const signOut = useCallback(async () => {
    await backendSignOut();
    setUser(null);
    setRole(null);
    setPermissions(null);
  }, []);

  return (
    <Ctx.Provider
      value={{
        user,
        role,
        permissions,
        isSuperAdmin: !!permissions?.is_super_admin,
        can: (pathname: string) => (role === "admin" ? canAccessPath(permissions, pathname) : true),
        loading,
        refresh,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
