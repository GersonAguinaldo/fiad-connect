import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type PresidencyState = {
  presidentId: string | null;
  teamIds: string[];
  isPresident: boolean;
  isTeam: boolean;
  /** Président Mondial ou membre de l'Équipe Présidentielle. */
  isPresidency: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
};

export function usePresidency(): PresidencyState {
  const { user } = useAuth();
  const [presidentId, setPresidentId] = useState<string | null>(null);
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [{ data: pres }, { data: team }] = await Promise.all([
      supabase.from("presidency_history").select("user_id").is("ended_at", null).maybeSingle(),
      supabase.from("presidency_team").select("user_id"),
    ]);
    setPresidentId((pres as { user_id: string } | null)?.user_id ?? null);
    setTeamIds(((team as { user_id: string }[]) ?? []).map((t) => t.user_id));
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isPresident = !!user && presidentId === user.id;
  const isTeam = !!user && teamIds.includes(user.id);
  return { presidentId, teamIds, isPresident, isTeam, isPresidency: isPresident || isTeam, loading, refresh };
}