import { useEffect, useState, useCallback } from "react";
import { API_URL, LOCAL_BACKEND } from "@/lib/api";

export type BackendMode = "cloud" | "local";
export type BackendState = "checking" | "online" | "offline";

/**
 * Vérifie périodiquement la disponibilité du backend local (/api/health).
 * En mode cloud, l'état est toujours "online".
 */
export function useBackendStatus(intervalMs = 30000) {
  const mode: BackendMode = LOCAL_BACKEND ? "local" : "cloud";
  const [state, setState] = useState<BackendState>(LOCAL_BACKEND ? "checking" : "online");
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const check = useCallback(async () => {
    if (!LOCAL_BACKEND) {
      setState("online");
      return;
    }
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch(`${API_URL}/api/health`, { signal: ctrl.signal });
      clearTimeout(timer);
      setState(res.ok ? "online" : "offline");
    } catch {
      setState("offline");
    } finally {
      setLastCheck(new Date());
    }
  }, []);

  useEffect(() => {
    void check();
    if (!LOCAL_BACKEND) return;
    const id = setInterval(() => void check(), intervalMs);
    return () => clearInterval(id);
  }, [check, intervalMs]);

  return { mode, state, lastCheck, recheck: check };
}