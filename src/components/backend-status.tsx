import { Cloud, HardDrive, Loader2, RefreshCw, WifiOff } from "lucide-react";
import { useBackendStatus } from "@/hooks/use-backend-status";

/** Badge compact indiquant la source de données (cloud vs local) et sa disponibilité. */
export function BackendStatusBadge() {
  const { mode, state, recheck } = useBackendStatus();

  const offline = state === "offline";
  const checking = state === "checking";

  const label = mode === "cloud" ? "Cloud" : offline ? "Local hors ligne" : "Local";
  const tone = offline
    ? "bg-destructive/10 text-destructive border-destructive/30"
    : checking
      ? "bg-secondary text-muted-foreground border-border"
      : "bg-primary-soft text-primary border-primary/20";

  return (
    <button
      type="button"
      onClick={() => void recheck()}
      title={
        mode === "cloud"
          ? "Données servies par le backend cloud"
          : offline
            ? "Le serveur local ne répond pas — cliquez pour réessayer"
            : "Connecté au serveur local"
      }
      className={
        "hidden sm:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full border text-xs font-medium transition " +
        tone
      }
    >
      {checking ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : offline ? (
        <WifiOff className="h-3.5 w-3.5" />
      ) : mode === "cloud" ? (
        <Cloud className="h-3.5 w-3.5" />
      ) : (
        <HardDrive className="h-3.5 w-3.5" />
      )}
      <span>{label}</span>
      {offline && <RefreshCw className="h-3 w-3" />}
    </button>
  );
}

/** Bandeau d'alerte affiché quand l'API locale est injoignable. */
export function BackendOfflineBanner() {
  const { mode, state, recheck } = useBackendStatus();
  if (mode !== "local" || state !== "offline") return null;

  return (
    <div className="bg-destructive/10 border-b border-destructive/30 px-3 sm:px-6 py-2 flex flex-wrap items-center gap-2 text-sm text-destructive">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span className="flex-1 min-w-0">
        Le serveur local est injoignable. Vos données ne peuvent pas être chargées ni enregistrées
        pour le moment.
      </span>
      <button
        type="button"
        onClick={() => void recheck()}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-destructive text-destructive-foreground text-xs font-semibold hover:opacity-90"
      >
        <RefreshCw className="h-3.5 w-3.5" /> Réessayer
      </button>
    </div>
  );
}