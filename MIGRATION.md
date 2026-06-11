# Migration Lovable Cloud → Backend Node/Express/MongoDB

Ce document trace le plan de bascule. Le backend cible est scaffolde dans `./backend` (voir `backend/README.md`).

## Etat actuel

- Frontend: TanStack Start (reste tel quel — c'est juste un client React + SSR).
- Backend: Lovable Cloud (Supabase) via `@/integrations/supabase/client` cote client et `createServerFn` cote serveur.
- Stockage fichiers: bucket Supabase `event-resources`.

## Cible

- Frontend: identique, mais tous les `supabase.*` remplaces par un client API maison (`src/lib/api.ts`) qui parle a Express en JSON.
- Backend: `./backend` (Express + Mongoose + JWT) — auto-heberge.
- Stockage fichiers: dossier `backend/uploads` servi en statique (ou S3 plus tard).
- Auth: JWT stocke dans `localStorage` (cle `lapadi_token`), envoye en `Authorization: Bearer ...`.

## Etapes de bascule (ordre conseille)

1. **Lancer le backend en local** (`backend/README.md`) et seeder l'admin.
2. **Ajouter `VITE_API_URL=http://localhost:4000` dans `.env`** du frontend.
3. **Creer `src/lib/api.ts`** — petit wrapper `fetch` qui attache le JWT et parse les erreurs. Squelette:
   ```ts
   const BASE = import.meta.env.VITE_API_URL;
   const token = () => localStorage.getItem("lapadi_token");
   export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
     const res = await fetch(`${BASE}${path}`, {
       ...init,
       headers: {
         "Content-Type": "application/json",
         ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
         ...(init.headers ?? {}),
       },
     });
     if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText);
     return res.status === 204 ? (undefined as T) : res.json();
   }
   ```
4. **Remplacer `useAuth`** (`src/hooks/use-auth.tsx`) — ne plus ecouter `supabase.auth.onAuthStateChange`. Charger l'utilisateur via `GET /api/auth/me` au montage si un token existe; `signOut` => `localStorage.removeItem`.
5. **Login / Register** (`src/routes/login.tsx`, `src/routes/register.tsx`):
   - `supabase.auth.signInWithPassword` => `POST /api/auth/login`
   - `supabase.auth.signUp` + insert profile => `POST /api/auth/register`
   - stocker `token` dans `localStorage`.
6. **Pages CRUD** — remplacer chaque `supabase.from("table").select/insert/update/delete` par un appel `api(...)` correspondant. Tableau de correspondance:

   | Ancien (Supabase)                                  | Nouveau (Express)                    |
   |----------------------------------------------------|--------------------------------------|
   | `from("profiles").select("*")`                     | `GET /api/profiles`                  |
   | `from("profiles").update().eq("user_id", uid)`     | `PATCH /api/profiles/me`             |
   | `from("events").select("*")`                       | `GET /api/events`                    |
   | `from("events").insert/update/delete`              | `POST/PATCH/DELETE /api/events[/:id]`|
   | `from("event_registrations").insert`               | `POST /api/events/:id/register`      |
   | `from("formations")...`                            | `/api/formations`                    |
   | `from("formation_enrollments").insert`             | `POST /api/formations/:id/enroll`    |
   | `from("transactions").select/insert`               | `/api/transactions` (`/me` cote user)|
   | `from("app_settings")...`                          | `GET/PATCH /api/settings`            |
   | `from("user_roles").select`                        | inclus dans `user.roles` du JWT      |
   | `storage.from("event-resources").upload`           | `POST /api/uploads` (multipart)      |

7. **Supprimer les server functions TanStack** qui ne servaient qu'a parler a Supabase, ou les transformer en simple proxy HTTP si tu veux garder un SSR partiel.
8. **Imports CSV** — `src/components/csv-import.tsx` parse deja localement; appeler `POST /api/<module>/import` avec le tableau JSON parse.
9. **Realtime** (si utilise) — remplacer par polling ou Socket.IO plus tard (non inclus dans le scaffold).
10. **Nettoyage Lovable** (a faire en dernier, une fois la bascule validee):
    - desinstaller `@supabase/supabase-js`,
    - supprimer `src/integrations/supabase/*`, `src/integrations/lovable*`,
    - retirer `attachSupabaseAuth` de `src/start.ts`,
    - supprimer `supabase/` (config + migrations) et `.env` (VITE_SUPABASE_*),
    - retirer les fichiers `*.functions.ts` devenus inutiles.

## A noter

- Tant que les pages utilisent encore `supabase`, ne supprime rien de Lovable Cloud — sinon la plateforme casse en preview.
- Le scaffold backend est un point de depart minimal mais fonctionnel. Pour la prod: passer `MONGODB_URI` sur Atlas, mettre le JWT en cookie HttpOnly + CSRF, et S3/R2 pour les uploads.
- L'admin par defaut (apres `npm run seed`): `admin@lapadi.local` / `ChangeMe!2026` — a changer immediatement.