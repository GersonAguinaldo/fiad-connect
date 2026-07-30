import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, ShieldX, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Search = { code?: string };

export const Route = createFileRoute("/verifier-certificat")({
  validateSearch: (s: Record<string, unknown>): Search => ({ code: typeof s.code === "string" ? s.code : undefined }),
  head: () => ({
    meta: [
      { title: "Vérifier un certificat — La PaDI" },
      { name: "description", content: "Vérifiez l'authenticité d'un certificat de formation La PaDI à partir de son code de vérification." },
      { property: "og:title", content: "Vérifier un certificat — La PaDI" },
      { property: "og:description", content: "Contrôle public d'authenticité des certificats La PaDI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VerifyPage,
});

type Cert = { code: string; holder_name: string | null; formation_title: string | null; issued_at: string };

function VerifyPage() {
  const { code } = Route.useSearch();
  const navigate = useNavigate();
  const [value, setValue] = useState(code ?? "");
  const [result, setResult] = useState<Cert | null | "none">(null);
  const [busy, setBusy] = useState(false);

  async function check(c: string) {
    if (!c.trim()) return;
    setBusy(true);
    const { data } = await supabase
      .from("certificates")
      .select("code,holder_name,formation_title,issued_at")
      .eq("code", c.trim().toUpperCase())
      .maybeSingle();
    setResult((data as Cert) ?? "none");
    setBusy(false);
  }

  useEffect(() => { if (code) { setValue(code); check(code); } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [code]);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="h-12 w-12 rounded-2xl bg-primary-soft text-primary inline-flex items-center justify-center mb-3">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-display font-bold">Vérifier un certificat</h1>
          <p className="text-sm text-muted-foreground mt-1">Saisissez le code figurant sur le certificat La PaDI.</p>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); navigate({ to: "/verifier-certificat", search: { code: value } }); check(value); }}
          className="flex gap-2"
        >
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="PADI-2026-XXXXXXXX"
            className="flex-1 h-11 px-4 rounded-full border border-border bg-card text-sm focus:outline-none focus:border-ring font-mono"
          />
          <button type="submit" disabled={busy} className="h-11 px-5 rounded-full bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-60">
            <Search className="h-4 w-4" /> Vérifier
          </button>
        </form>

        {result === "none" && (
          <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-center">
            <ShieldX className="h-6 w-6 text-destructive mx-auto mb-2" />
            <p className="text-sm font-semibold text-destructive">Aucun certificat ne correspond à ce code.</p>
          </div>
        )}
        {result && result !== "none" && (
          <div className="mt-6 rounded-2xl border-2 border-primary/30 bg-card p-6 text-center">
            <ShieldCheck className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-emerald-600">Certificat authentique</p>
            <p className="text-lg font-display font-bold mt-3">{result.holder_name ?? "—"}</p>
            <p className="text-sm text-muted-foreground">a complété la formation</p>
            <p className="text-base font-semibold text-primary mt-1">{result.formation_title ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-3">
              Délivré le {new Date(result.issued_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </p>
            <p className="text-xs mt-1 font-mono">{result.code}</p>
          </div>
        )}
      </div>
    </main>
  );
}