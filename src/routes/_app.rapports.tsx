import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, PageHeader } from "@/components/page-stub";

export const Route = createFileRoute("/_app/rapports")({
  head: () => ({ meta: [{ title: "Rapports — FIAD-Monde" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const [stats, setStats] = useState({ members: 0, formations: 0, events: 0, enrollments: 0, revenue: 0 });

  useEffect(() => {
    (async () => {
      const [m, f, e, en, tx] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("formations").select("*", { count: "exact", head: true }),
        supabase.from("events").select("*", { count: "exact", head: true }),
        supabase.from("formation_enrollments").select("*", { count: "exact", head: true }),
        supabase.from("transactions").select("amount,status").eq("status", "Réussi"),
      ]);
      setStats({
        members: m.count ?? 0,
        formations: f.count ?? 0,
        events: e.count ?? 0,
        enrollments: en.count ?? 0,
        revenue: (tx.data ?? []).reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0),
      });
    })();
  }, []);

  const cards = [
    { l: "Membres", v: String(stats.members) },
    { l: "Formations", v: String(stats.formations) },
    { l: "Événements", v: String(stats.events) },
    { l: "Inscriptions formations", v: String(stats.enrollments) },
    { l: "Cotisations encaissées", v: new Intl.NumberFormat("fr-FR").format(Math.round(stats.revenue)) + " FCFA" },
  ];

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader icon={<BarChart3 className="h-6 w-6" />} eyebrow="Analyses" title="Rapports & statistiques" subtitle="Engagement, formations, finances et impact." />
      <div className="grid md:grid-cols-3 gap-4">
        {cards.map((k) => (
          <Card key={k.l}><div className="text-sm text-muted-foreground">{k.l}</div><div className="text-3xl font-display font-extrabold mt-2 text-primary">{k.v}</div></Card>
        ))}
      </div>
    </div>
  );
}
