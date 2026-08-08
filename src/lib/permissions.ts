/** Modules administrables et périmètre de délégation des administrateurs. */

export type AdminPermissions = {
  user_id: string;
  is_super_admin: boolean;
  modules: string[];
  cities: string[];
  countries: string[];
};

export type AdminModule = {
  key: string;
  label: string;
  /** Préfixes de routes couverts par ce module. */
  paths: string[];
};

export const ADMIN_MODULES: AdminModule[] = [
  { key: "dashboard", label: "Vue d'ensemble", paths: ["/dashboard"] },
  { key: "membres", label: "Membres", paths: ["/membres"] },
  { key: "cours", label: "Cours en direct", paths: ["/cours"] },
  { key: "formations", label: "Formations & certificats", paths: ["/formations", "/formation", "/mes-certificats"] },
  { key: "evenements", label: "Événements", paths: ["/evenements"] },
  { key: "calendrier", label: "Calendrier", paths: ["/calendrier"] },
  { key: "finances", label: "Finances", paths: ["/finances", "/mes-finances"] },
  { key: "avantages", label: "Avantages", paths: ["/avantages"] },
  { key: "messages", label: "Messages", paths: ["/messages"] },
  { key: "presidence", label: "Présidence Mondiale", paths: ["/presidence"] },
  { key: "rapports", label: "Rapports", paths: ["/rapports"] },
  { key: "parametres", label: "Paramètres", paths: ["/parametres"] },
];

/** Routes réservées aux super administrateurs. */
export const SUPER_ADMIN_PATHS = ["/administrateurs", "/presidence"];

export function moduleForPath(pathname: string): AdminModule | undefined {
  return ADMIN_MODULES.find((m) => m.paths.some((p) => pathname.startsWith(p)));
}

export function isSuperAdmin(perms: AdminPermissions | null): boolean {
  return !!perms?.is_super_admin;
}

/** Un admin peut-il accéder à ce chemin ? Un super admin accède à tout. */
export function canAccessPath(perms: AdminPermissions | null, pathname: string): boolean {
  if (perms?.is_super_admin) return true;
  if (SUPER_ADMIN_PATHS.some((p) => pathname.startsWith(p))) return false;
  const mod = moduleForPath(pathname);
  if (!mod) return true;
  return (perms?.modules ?? []).includes(mod.key);
}

/** Filtre géographique appliqué aux données d'un admin délégué. */
export function inGeoScope(
  perms: AdminPermissions | null,
  row: { city?: string | null; country?: string | null },
): boolean {
  if (!perms || perms.is_super_admin) return true;
  const norm = (v?: string | null) => (v ?? "").trim().toLowerCase();
  if (perms.countries.length > 0 && !perms.countries.map(norm).includes(norm(row.country))) return false;
  if (perms.cities.length > 0 && !perms.cities.map(norm).includes(norm(row.city))) return false;
  return true;
}

export function scopeLabel(perms: AdminPermissions | null): string {
  if (!perms) return "—";
  if (perms.is_super_admin) return "Accès complet";
  const geo = [...perms.countries, ...perms.cities].filter(Boolean);
  const mods = perms.modules.length
    ? perms.modules
        .map((k) => ADMIN_MODULES.find((m) => m.key === k)?.label ?? k)
        .join(", ")
    : "Aucun module";
  return geo.length ? `${mods} · ${geo.join(", ")}` : mods;
}