import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  getCurrentUser,
  onAuthChange,
  signOut as backendSignOut,
  type AppRole,
  type AppUser,
} from "@/lib/auth-backend";

export type { AppRole } from "@/lib/auth-backend";

type AuthCtx = {
  user: AppUser | null;
  role: AppRole | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  role: null,
  loading: true,
  refresh: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const current = await getCurrentUser();
      setUser(current?.user ?? null);
      setRole(current?.role ?? null);
    } catch {
      setUser(null);
      setRole(null);
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
  }, []);

  return (
    <Ctx.Provider value={{ user, role, loading, refresh, signOut }}>{children}</Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
