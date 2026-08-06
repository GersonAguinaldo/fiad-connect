import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Search, Loader2, UserPlus, UserMinus, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, PageHeader } from "@/components/page-stub";
import { Avatar } from "@/components/avatar";
import { ADMIN_MODULES, scopeLabel, type AdminPermissions } from "@/lib/permissions";

export const Route = createFileRoute("/_app/administrateurs")({
  head: () => ({
    meta: [
      { title: "Administrateurs — La PaDI" },
      { name: "description", content: "Créez des administrateurs et déléguez-leur des modules et un périmètre géographique." },
    ],
  }),
  component: AdminsPage,
});

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  city: string | null;
  country: string | null;
};

function AdminsPage() {
  const { user, isSuperAdmin } = useAuth();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [adminIds, setAdminIds] = useState<string[]>([]);
  const [perms, setPerms] = useState<Record<string, AdminPermissions>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: profs }, { data: roles }, { data: ap }] = await Promise.all([
      supabase.from("profiles").select("id, first_name, last_name, email, city, country").order("first_name"),
      supabase.from("user_roles").select("user_id, role").eq("role", "admin"),
      supabase.from("admin_permissions").select("user_id, is_super_admin, modules, cities, countries"),
    ]);
    setProfiles((profs as ProfileRow[]) ?? []);
    setAdminIds((roles ?? []).map((r) => r.user_id));
    const map: Record<string, AdminPermissions> = {};
    for (const row of (ap as AdminPermissions[]) ?? []) map[row.user_id] = row;
    setPerms(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!isSuperAdmin) {
    return (
      <div className="max-w-[900px] mx-auto">
        <Card>
          <p className="text-sm text-muted-foreground">
            Seuls les super administrateurs peuvent gérer les administrateurs.
          </p>
        </Card>
      </div>
    );
  }

  async function promote(p: ProfileRow) {
    const { error } = await supabase.from("user_roles").insert({ user_id: p.id, role: "admin" } as never);
    if (error) return toast.error(error.message);
    const { error: e2 } = await supabase
      .from("admin_permissions")
      .upsert({ user_id: p.id, is_super_admin: false, modules: [], cities: [], countries: [] } as never);
    if (e2) return toast.error(e2.message);
    toast.success("Administrateur créé");
    setEditing(p.id);
    void load();
  }

  async function demote(id: string) {
    if (id === user?.id) return toast.error("Vous ne pouvez pas retirer vos propres droits.");
    if (!confirm("Retirer les droits d'administrateur ?")) return;
    const { error } = await supabase.from("user_roles").delete().eq("user_id", id).eq("role", "admin");
    if (error) return toast.error(error.message);
    await supabase.from("admin_permissions").delete().eq("user_id", id);
    toast.success("Droits retirés");
    void load();
  }

  const term = q.trim().toLowerCase();
  const match = (p: ProfileRow) =>
    !term ||
    [p.first_name, p.last_name, p.email, p.city, p.country]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(term);

  const admins = profiles.filter((p) => adminIds.includes(p.id) && match(p));
  const others = profiles.filter((p) => !adminIds.includes(p.id) && match(p));

  return (
    <div className="max-w-[1100px] mx-auto">
      <PageHeader
        eyebrow="Console Admin"
        title="Administrateurs & permissions"
        subtitle="Créez des administrateurs et limitez-les à certains modules, villes ou pays."
        icon={<ShieldCheck className="h-6 w-6" />}
      />

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher une personne…"
          className="w-full h-10 pl-10 pr-4 rounded-lg bg-card border border-border focus:border-ring focus:outline-none text-sm"
        />
      </div>

      {loading ? (
        <div className="p-8 text-muted-foreground inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </div>
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="font-display font-bold mb-3">Administrateurs ({admins.length})</h2>
            <div className="space-y-3">
              {admins.length === 0 && <Card><p className="text-sm text-muted-foreground">Aucun administrateur.</p></Card>}
              {admins.map((p) => {
                const perm = perms[p.id] ?? null;
                const name = [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "Membre";
                return (
                  <Card key={p.id}>
                    <div className="flex items-start gap-3 flex-wrap">
                      <Avatar name={name} />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate">{name}</div>
                        <div className="text-xs text-muted-foreground truncate">{p.email}</div>
                        <div className="text-xs text-muted-foreground mt-1">{scopeLabel(perm)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditing(editing === p.id ? null : p.id)}
                          className="h-9 px-3 rounded-lg border border-border text-sm font-semibold hover:bg-secondary"
                        >
                          {editing === p.id ? "Fermer" : "Permissions"}
                        </button>
                        <button
                          onClick={() => demote(p.id)}
                          className="h-9 px-3 rounded-lg border border-border text-sm font-semibold text-destructive hover:bg-destructive/10 inline-flex items-center gap-1.5"
                        >
                          <UserMinus className="h-4 w-4" /> Retirer
                        </button>
                      </div>
                    </div>
                    {editing === p.id && (
                      <PermissionEditor
                        userId={p.id}
                        value={perm}
                        onSaved={() => {
                          setEditing(null);
                          void load();
                        }}
                      />
                    )}
                  </Card>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="font-display font-bold mb-3">Promouvoir un membre</h2>
            <Card>
              <ul className="divide-y divide-border max-h-96 overflow-auto -m-2">
                {others.length === 0 && <li className="p-3 text-sm text-muted-foreground">Aucun membre.</li>}
                {others.map((p) => {
                  const name = [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "Membre";
                  return (
                    <li key={p.id} className="flex items-center gap-3 p-2.5">
                      <Avatar name={name} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {[p.email, p.city, p.country].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                      <button
                        onClick={() => promote(p)}
                        className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-1.5 shrink-0"
                      >
                        <UserPlus className="h-4 w-4" /> Nommer admin
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </section>
        </div>
      )}
    </div>
  );
}

function PermissionEditor({
  userId,
  value,
  onSaved,
}: {
  userId: string;
  value: AdminPermissions | null;
  onSaved: () => void;
}) {
  const [superAdmin, setSuperAdmin] = useState(value?.is_super_admin ?? false);
  const [modules, setModules] = useState<string[]>(value?.modules ?? []);
  const [cities, setCities] = useState((value?.cities ?? []).join(", "));
  const [countries, setCountries] = useState((value?.countries ?? []).join(", "));
  const [saving, setSaving] = useState(false);

  function toggle(key: string) {
    setModules((m) => (m.includes(key) ? m.filter((k) => k !== key) : [...m, key]));
  }

  const split = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("admin_permissions").upsert({
      user_id: userId,
      is_super_admin: superAdmin,
      modules,
      cities: split(cities),
      countries: split(countries),
    } as never);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Permissions enregistrées");
    onSaved();
  }

  return (
    <div className="mt-4 pt-4 border-t border-border space-y-4">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={superAdmin} onChange={(e) => setSuperAdmin(e.target.checked)} />
        Super administrateur (accès complet, peut gérer les autres administrateurs)
      </label>

      <div className={superAdmin ? "opacity-50 pointer-events-none" : ""}>
        <div className="text-sm font-medium mb-2">Modules autorisés</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {ADMIN_MODULES.map((m) => (
            <label key={m.key} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-border">
              <input type="checkbox" checked={modules.includes(m.key)} onChange={() => toggle(m.key)} />
              {m.label}
            </label>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mt-4">
          <div>
            <div className="text-sm font-medium mb-1">Pays (vide = tous)</div>
            <input
              value={countries}
              onChange={(e) => setCountries(e.target.value)}
              placeholder="Gabon, Sénégal"
              className="w-full h-10 px-3 rounded-lg bg-card border border-border text-sm"
            />
          </div>
          <div>
            <div className="text-sm font-medium mb-1">Villes (vide = toutes)</div>
            <input
              value={cities}
              onChange={(e) => setCities(e.target.value)}
              placeholder="Libreville, Dakar"
              className="w-full h-10 px-3 rounded-lg bg-card border border-border text-sm"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="h-10 px-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60"
        >
          <Save className="h-4 w-4" /> {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}