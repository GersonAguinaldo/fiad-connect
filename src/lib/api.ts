/**
 * Client HTTP pour le backend local (Node/Express/MongoDB) situe dans ./backend.
 *
 * Commutateur de bascule :
 *  - si `VITE_API_URL` est defini  -> l'application parle au backend local.
 *  - sinon                         -> l'application continue d'utiliser Lovable Cloud.
 * Cela permet de migrer progressivement sans casser l'apercu.
 */

export const API_URL = (import.meta.env['VITE_API_URL'] ?? "").replace(/\/+$/, "");

/** true quand le frontend doit taper sur le backend local. */
export const LOCAL_BACKEND = API_URL.length > 0;

export const TOKEN_KEY = "lapadi_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage indisponible */
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string; message?: string };
    return body.error ?? body.message ?? res.statusText;
  } catch {
    return res.statusText || `Erreur ${res.status}`;
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!LOCAL_BACKEND) {
    throw new ApiError("VITE_API_URL n'est pas configure (backend local inactif).", 0);
  }
  const token = getToken();
  const isForm = init.body instanceof FormData;
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new ApiError(await parseError(res), res.status);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const apiGet = <T,>(path: string) => api<T>(path);
export const apiPost = <T,>(path: string, body?: unknown) =>
  api<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
export const apiPatch = <T,>(path: string, body?: unknown) =>
  api<T>(path, { method: "PATCH", body: body === undefined ? undefined : JSON.stringify(body) });
export const apiDelete = <T,>(path: string) => api<T>(path, { method: "DELETE" });

/** Upload multipart -> POST /api/uploads, renvoie l'URL publique du fichier. */
export async function apiUpload(file: File, folder?: string): Promise<{ url: string }> {
  const fd = new FormData();
  fd.append("file", file);
  if (folder) fd.append("folder", folder);
  return api<{ url: string }>("/api/uploads", { method: "POST", body: fd });
}
