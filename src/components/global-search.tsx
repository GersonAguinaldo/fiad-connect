import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, Loader2, Users, CalendarDays, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Result = {
  id: string;
  label: string;
  sub?: string;
  kind: "membre" | "evenement" | "formation";
  to: string;
};

const ICONS = { membre: Users, evenement: CalendarDays, formation: GraduationCap };
const KIND_LABEL = { membre: "Membre", evenement: "Événement", formation: "Formation" };

export function GlobalSearch({ compact = false }: { compact?: boolean }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      const like = `%${term}%`;
      const [profiles, events, formations] = await Promise.all([
        supabase
          .from("profiles")
          .select("id,first_name,last_name,email,city")
          .or(`first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like}`)
          .limit(5),
        supabase.from("events").select("id,title,event_date").ilike("title", like).limit(5),
        supabase.from("formations").select("id,title,instructor").ilike("title", like).limit(5),
      ]);

      const out: Result[] = [
        ...(profiles.data ?? []).map((p) => ({
          id: p.id,
          kind: "membre" as const,
          label: [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "Membre",
          sub: p.email ?? p.city ?? undefined,
          to: `/membres/${p.id}`,
        })),
        ...(events.data ?? []).map((e) => ({
          id: e.id,
          kind: "evenement" as const,
          label: e.title,
          sub: e.event_date ? new Date(e.event_date).toLocaleDateString("fr-FR") : undefined,
          to: `/evenements`,
        })),
        ...(formations.data ?? []).map((f) => ({
          id: f.id,
          kind: "formation" as const,
          label: f.title,
          sub: f.instructor ?? undefined,
          to: `/formation/${f.id}`,
        })),
      ];
      setResults(out);
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  function go(r: Result) {
    setOpen(false);
    setQ("");
    navigate({ to: r.to });
  }

  return (
    <div ref={boxRef} className="relative w-full">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        type="search"
        value={q}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        placeholder={compact ? "Rechercher…" : "Rechercher un membre, un cours, un événement…"}
        className={
          "w-full h-10 pl-10 pr-9 bg-secondary border border-transparent focus:bg-card focus:border-ring focus:outline-none text-sm transition " +
          (compact ? "rounded-lg" : "rounded-full")
        }
      />
      {loading && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
      )}
      {open && q.trim().length >= 2 && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-border bg-card shadow-[var(--shadow-elevated)] overflow-hidden">
          {results.length === 0 && !loading ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">Aucun résultat.</div>
          ) : (
            <ul className="max-h-80 overflow-auto py-1">
              {results.map((r) => {
                const Icon = ICONS[r.kind];
                return (
                  <li key={r.kind + r.id}>
                    <button
                      onClick={() => go(r)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-secondary transition"
                    >
                      <span className="h-8 w-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium truncate">{r.label}</span>
                        {r.sub && (
                          <span className="block text-xs text-muted-foreground truncate">{r.sub}</span>
                        )}
                      </span>
                      <span className="text-[11px] uppercase tracking-wide text-muted-foreground shrink-0">
                        {KIND_LABEL[r.kind]}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}