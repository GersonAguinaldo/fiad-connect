import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Crown, Search, Loader2, UserPlus, UserMinus, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, PageHeader } from "@/components/page-stub";
import { Avatar } from "@/components/avatar";
import { searchDirectory, type DirectoryMember } from "@/lib/messaging";

export const Route = createFileRoute("/_app/presidence")({
  head: () => ({
    meta: [
      { title: "Présidence Mondiale — La PaDI" },
      {
        name: "description",
        content:
          "Désignez le Président Mondial, gérez l'Équipe Présidentielle et consultez l'historique du rôle.",
      },
    ],
  }),
  component: PresidencePage,
});

type HistoryRow = {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  note: string | null;
};

function PresidencePage() {
  const { user, role } = useAuth();
  const isAdmin = role === "admin";
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [team, setTeam] = useState<string[]>([]);
  const [people, setPeople] = useState<DirectoryMember[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: h }, { data: t }, dir] = await Promise.all([
      supabase.from("presidency_history").select("id, user_id, started_at, ended_at, note").order("started_at", { ascending: false }),
      supabase.from("presidency_team").select("user_id"),
      searchDirectory(),
    ]);
    setHistory((h as HistoryRow[]) ?? []);
    setTeam(((t as { user_id: string }[]) ?? []).map((r) => r.user_id));
    setPeople(dir);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const byId = useMemo(() => {
    const m: Record<string, DirectoryMember> = {};
    for (const p of people) m[p.id] = p;
    return m;
  }, [people]);

  const nameOf = (id: string) => byId[id]?.full_name || "Membre";
  const current = history.find((h) => h.ended_at === null) ?? null;

  if (!isAdmin) {
    return (
      <div className="max-w-[900px] mx-auto">
        <Card>
          <p className="text-sm text-muted-foreground">Réservé aux administrateurs.</p>
        </Card>
      </div>
    );
  }

  async function assignPresident(target: DirectoryMember) {
    const label = target.full_name || "ce membre";
    const msg = current
      ? `Transférer le rôle de Président Mondial de ${nameOf(current.user_id)} vers ${label} ? Toutes les demandes du canal « Accès direct au Président Mondial » lui seront désormais adressées.`
      : `Désigner ${label} comme Président Mondial ?`;
    if (!confirm(msg)) return;
    if (current) {
      const { error } = await supabase
        .from("presidency_history")
        .update({ ended_at: new Date().toISOString(), revoked_by: user?.id ?? null } as never)
        .eq("id", current.id);
      if (error) return toast.error(error.message);
    }
    const { error } = await supabase
      .from("presidency_history")
      .insert({ user_id: target.id, assigned_by: user?.id ?? null } as never);
    if (error) return toast.error(error.message);
    toast.success("Président Mondial désigné");
    void load();
  }

  async function revokePresident() {
    if (!current) return;
    if (!confirm("Révoquer le Président Mondial actuel ? Le canal restera accessible à l'Équipe Présidentielle.")) return;
    const { error } = await supabase
      .from("presidency_history")
      .update({ ended_at: new Date().toISOString(), revoked_by: user?.id ?? null } as never)
      .eq("id", current.id);
    if (error) return toast.error(error.message);
    toast.success("Rôle révoqué");
    void load();
  }

  async function toggleTeam(target: DirectoryMember) {
    if (team.includes(target.id)) {
      const { error } = await supabase.from("presidency_team").delete().eq("user_id", target.id);
      if (error) return toast.error(error.message);
      toast.success("Permission retirée");
    } else {
      const { error } = await supabase
        .from("presidency_team")
        .insert({ user_id: target.id, added_by: user?.id ?? null } as never);
      if (error) return toast.error(error.message);
      toast.success("Membre de l'Équipe Présidentielle ajouté");
    }
    void load();
  }

  const term = q.trim().toLowerCase();
  const filtered = people.filter(
    (p) => !term || [p.full_name, p.city, p.country].filter(Boolean).join(" ").toLowerCase().includes(term),
  );

  return (
    <div className="max-w-[1100px] mx-auto">
      <PageHeader
        eyebrow="Console Admin"
        title="Présidence Mondiale"
        subtitle="Un seul Président Mondial à la fois, une Équipe Présidentielle illimitée."
        icon={<Crown className="h-6 w-6" />}
      />

      {loading ? (
        <div className="p-8 text-muted-foreground inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <h2 className="font-display font-bold mb-3">Président Mondial en poste</h2>
            {current ? (
              <div className="flex items-center gap-3 flex-wrap">
                <Avatar name={nameOf(current.user_id)} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{nameOf(current.user_id)}</div>
                  <div className="text-xs text-muted-foreground">
                    En poste depuis le {new Date(current.started_at).toLocaleDateString("fr-FR")}
                  </div>
                </div>
                <button
                  onClick={revokePresident}
                  className="h-9 px-3 rounded-lg border border-border text-sm font-semibold text-destructive hover:bg-destructive/10"
                >
                  Révoquer
                </button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucun Président Mondial désigné. Sélectionnez un membre ci-dessous.
              </p>
            )}
          </Card>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher un membre…"
              className="w-full h-10 pl-10 pr-4 rounded-lg bg-card border border-border focus:border-ring focus:outline-none text-sm"
            />
          </div>

          <Card>
            <h2 className="font-display font-bold mb-3">
              Attribution des rôles ({team.length} membre{team.length > 1 ? "s" : ""} dans l'Équipe Présidentielle)
            </h2>
            <ul className="divide-y divide-border max-h-[28rem] overflow-auto -m-2">
              {filtered.length === 0 && <li className="p-3 text-sm text-muted-foreground">Aucun membre.</li>}
              {filtered.map((p) => {
                const isPresident = current?.user_id === p.id;
                const inTeam = team.includes(p.id);
                return (
                  <li key={p.id} className="flex items-center gap-3 p-2.5 flex-wrap">
                    <Avatar name={p.full_name || "Membre"} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{p.full_name || "Membre"}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {[p.city, p.country].filter(Boolean).join(" · ") || "—"}
                      </div>
                      <div className="flex gap-1.5 mt-1 flex-wrap">
                        {isPresident && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-semibold">
                            Président Mondial
                          </span>
                        )}
                        {inTeam && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary-soft text-primary font-semibold">
                            Équipe Présidentielle
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!isPresident && (
                        <button
                          onClick={() => assignPresident(p)}
                          className="h-9 px-3 rounded-lg border border-border text-sm font-semibold hover:bg-secondary"
                        >
                          {current ? "Transférer la présidence" : "Nommer Président"}
                        </button>
                      )}
                      <button
                        onClick={() => toggleTeam(p)}
                        className={
                          "h-9 px-3 rounded-lg text-sm font-semibold inline-flex items-center gap-1.5 " +
                          (inTeam
                            ? "border border-border text-destructive hover:bg-destructive/10"
                            : "bg-primary text-primary-foreground")
                        }
                      >
                        {inTeam ? <UserMinus className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                        {inTeam ? "Retirer de l'équipe" : "Équipe Présidentielle"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card>
            <h2 className="font-display font-bold mb-3 inline-flex items-center gap-2">
              <History className="h-4 w-4" /> Historique du rôle
            </h2>
            <ul className="space-y-2">
              {history.length === 0 && <li className="text-sm text-muted-foreground">Aucun historique.</li>}
              {history.map((h) => (
                <li key={h.id} className="text-sm flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{nameOf(h.user_id)}</span>
                  <span className="text-muted-foreground">
                    du {new Date(h.started_at).toLocaleDateString("fr-FR")}
                    {h.ended_at ? ` au ${new Date(h.ended_at).toLocaleDateString("fr-FR")}` : " — en cours"}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}