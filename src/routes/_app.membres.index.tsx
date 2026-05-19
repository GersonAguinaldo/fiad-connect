import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, SlidersHorizontal, Download, Plus, Pin, RefreshCw, ChevronDown } from "lucide-react";
import { MEMBERS, type Member } from "@/lib/mock-data";
import { Avatar } from "./_app.dashboard";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/membres/")({
  head: () => ({ meta: [{ title: "Membres — FIAD-Monde" }] }),
  component: MembersPage,
});

function MembersPage() {
  const [realMembers, setRealMembers] = useState<Member[]>([]);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, first_name, last_name, email, country, created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!data) return;
        setRealMembers(
          data.map((p) => ({
            id: p.id,
            name: [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "Membre",
            email: p.email ?? "",
            category: "Ambassadeur",
            status: "Actif",
            city: "—",
            country: p.country ?? "—",
            joined: new Date(p.created_at).toLocaleDateString("fr-FR"),
            ytdSpending: "—",
            owner: "—",
          })) as Member[],
        );
      });
  }, []);

  const rows = [...realMembers, ...MEMBERS];

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary-soft text-primary flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
              <path d="M3 21V8l9-5 9 5v13M9 21v-7h6v7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Membres</div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-display font-extrabold">Tous les membres</h1>
              <button className="h-7 w-7 rounded-full bg-primary-soft text-primary flex items-center justify-center hover:bg-primary/10">
                <Pin className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {rows.length} membres · {realMembers.length} inscrits · Tri par nom · Mis à jour à l'instant
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-9 px-4 rounded-lg border border-primary text-primary text-sm font-medium hover:bg-primary-soft">Nouveau</button>
          <button className="h-9 px-4 rounded-lg border border-primary text-primary text-sm font-medium hover:bg-primary-soft">Importer</button>
          <button className="h-9 px-4 rounded-lg border border-primary text-primary text-sm font-medium hover:bg-primary-soft">Affecter</button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mt-5 flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input placeholder="Rechercher…" className="w-full h-9 pl-10 pr-4 rounded-lg bg-card border border-border focus:border-ring focus:outline-none text-sm" />
        </div>
        <div className="flex items-center gap-1.5">
          <ToolBtn><SlidersHorizontal className="h-4 w-4" /></ToolBtn>
          <ToolBtn><RefreshCw className="h-4 w-4" /></ToolBtn>
          <ToolBtn><Download className="h-4 w-4" /></ToolBtn>
          <ToolBtn><Plus className="h-4 w-4" /></ToolBtn>
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 bg-card rounded-2xl border border-border overflow-hidden shadow-[var(--shadow-card)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-foreground">
              <tr className="text-left">
                <Th className="w-10"><input type="checkbox" className="accent-[var(--primary)]" /></Th>
                {["Nom", "Catégorie", "Statut", "Ville", "Pays", "Adhésion", "Cotisations (an)", "Responsable"].map((h) => (
                  <Th key={h}>
                    <span className="inline-flex items-center gap-1">{h} <ChevronDown className="h-3 w-3 opacity-50" /></span>
                  </Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((m, i) => (
                <tr
                  key={m.id}
                  className={"border-t border-border hover:bg-primary-soft/40 transition " + (i < realMembers.length ? "bg-primary-soft/30" : "")}
                >
                  <td className="px-4 py-3"><input type="checkbox" className="accent-[var(--primary)]" /></td>
                  <td className="px-4 py-3">
                    <Link to="/membres/$memberId" params={{ memberId: m.id }} className="flex items-center gap-3 group">
                      <Avatar name={m.name} />
                      <div>
                        <div className="font-semibold text-primary group-hover:underline">{m.name}</div>
                        <div className="text-xs text-muted-foreground">{m.email}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3"><CategoryPill value={m.category} /></td>
                  <td className="px-4 py-3"><StatusPill value={m.status} /></td>
                  <td className="px-4 py-3 text-foreground">{m.city}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.country}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.joined}</td>
                  <td className="px-4 py-3 tabular-nums">{m.ytdSpending}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={"px-4 py-3 text-xs font-semibold uppercase tracking-wider " + className}>{children}</th>;
}

function ToolBtn({ children }: { children: React.ReactNode }) {
  return <button className="h-9 w-9 rounded-lg border border-border bg-card text-muted-foreground hover:text-primary hover:border-primary inline-flex items-center justify-center">{children}</button>;
}

function CategoryPill({ value }: { value: string }) {
  return <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-primary-soft text-primary">{value}</span>;
}

function StatusPill({ value }: { value: "Actif" | "En attente" | "Suspendu" }) {
  const map = {
    "Actif": { bg: "color-mix(in oklab, var(--color-success) 18%, white)", fg: "var(--color-success)" },
    "En attente": { bg: "color-mix(in oklab, var(--color-warning) 22%, white)", fg: "oklch(0.45 0.15 75)" },
    "Suspendu": { bg: "color-mix(in oklab, var(--destructive) 15%, white)", fg: "var(--destructive)" },
  };
  const s = map[value];
  return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: s.bg, color: s.fg }}>
    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.fg }} />
    {value}
  </span>;
}