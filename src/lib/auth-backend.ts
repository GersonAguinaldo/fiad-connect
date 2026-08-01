/**
 * Couche d'authentification unifiee.
 * Elle expose une API stable au frontend et choisit la source :
 *  - backend local Express (`VITE_API_URL` defini)
 *  - Lovable Cloud sinon.
 */
import { LOCAL_BACKEND, apiGet, apiPost, setToken, getToken } from "@/lib/api";

export type AppRole = "admin" | "membre";

export type AppUser = {
  id: string;
  email?: string;
  user_metadata?: { first_name?: string; last_name?: string; [k: string]: unknown };
};

export type AuthResult = {
  user: AppUser | null;
  /** true si une session utilisable est active immediatement apres l'appel. */
  hasSession: boolean;
};

type LocalMe = {
  user: { id: string; email: string; roles?: string[] };
  profile?: { firstName?: string; lastName?: string } | null;
};

type LocalAuth = { token: string; user: { id: string; email: string; roles?: string[] } };

async function supa() {
  const { supabase } = await import("@/integrations/supabase/client");
  return supabase;
}

function toAppUser(u: LocalMe["user"], profile?: LocalMe["profile"]): AppUser {
  return {
    id: u.id,
    email: u.email,
    user_metadata: { first_name: profile?.firstName, last_name: profile?.lastName },
  };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (LOCAL_BACKEND) {
    const res = await apiPost<LocalAuth>("/api/auth/login", { email, password });
    setToken(res.token);
    return { user: toAppUser(res.user), hasSession: true };
  }
  const supabase = await supa();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return { user: (data.user as AppUser | null) ?? null, hasSession: !!data.session };
}

export type SignUpPayload = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  sex?: string;
  birthDate?: string;
  birthPlace?: string;
  country?: string;
  city?: string;
  address?: string;
  redirectTo?: string;
};

export async function signUp(payload: SignUpPayload): Promise<AuthResult> {
  if (LOCAL_BACKEND) {
    const res = await apiPost<LocalAuth>("/api/auth/register", payload);
    setToken(res.token);
    return { user: toAppUser(res.user), hasSession: true };
  }
  const supabase = await supa();
  const { data, error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      emailRedirectTo: payload.redirectTo,
      data: {
        first_name: payload.firstName,
        last_name: payload.lastName,
        phone: payload.phone,
        sex: payload.sex,
        birth_date: payload.birthDate,
        birth_place: payload.birthPlace,
        country: payload.country,
        city: payload.city,
        address: payload.address,
        membership_type: "Classique",
      },
    },
  });
  if (error) throw new Error(error.message);
  return { user: (data.user as AppUser | null) ?? null, hasSession: !!data.session };
}

export async function signOut(): Promise<void> {
  if (LOCAL_BACKEND) {
    setToken(null);
    return;
  }
  const supabase = await supa();
  await supabase.auth.signOut();
}

/** Utilisateur courant + role, ou null si non connecte. */
export async function getCurrentUser(): Promise<{ user: AppUser; role: AppRole } | null> {
  if (LOCAL_BACKEND) {
    if (!getToken()) return null;
    try {
      const me = await apiGet<LocalMe>("/api/auth/me");
      return {
        user: toAppUser(me.user, me.profile),
        role: me.user.roles?.includes("admin") ? "admin" : "membre",
      };
    } catch {
      setToken(null);
      return null;
    }
  }
  const supabase = await supa();
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return null;
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  return {
    user: user as AppUser,
    role: roles?.some((r) => r.role === "admin") ? "admin" : "membre",
  };
}

/** Ecoute les changements de session. Renvoie une fonction de desabonnement. */
export function onAuthChange(cb: () => void): () => void {
  if (LOCAL_BACKEND) {
    const handler = (e: StorageEvent) => {
      if (e.key === "lapadi_token") cb();
    };
    if (typeof window !== "undefined") window.addEventListener("storage", handler);
    return () => {
      if (typeof window !== "undefined") window.removeEventListener("storage", handler);
    };
  }
  let unsub = () => {};
  void supa().then((supabase) => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") cb();
    });
    unsub = () => data.subscription.unsubscribe();
  });
  return () => unsub();
}
