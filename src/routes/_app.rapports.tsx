import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { Card, PageHeader } from "@/components/page-stub";

export const Route = createFileRoute("/_app/rapports")({
  head: () => ({ meta: [{ title: "Rapports — FIAD-Monde" }] }),
  component: () => (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader icon={<BarChart3 className="h-6 w-6" />} eyebrow="Analyses" title="Rapports & statistiques" subtitle="Engagement, formations, finances et impact." />
      <div className="grid md:grid-cols-3 gap-4">
        {[{l:"Taux d'engagement",v:"78%"},{l:"Cours complétés",v:"1 204"},{l:"Satisfaction membres",v:"4.6/5"}].map(k=> (
          <Card key={k.l}><div className="text-sm text-muted-foreground">{k.l}</div><div className="text-3xl font-display font-extrabold mt-2 text-primary">{k.v}</div></Card>
        ))}
      </div>
    </div>
  ),
});