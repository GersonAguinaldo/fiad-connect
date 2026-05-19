import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap, Users2, Clock } from "lucide-react";
import { FORMATIONS } from "@/lib/mock-data";
import { Card, PageHeader, PrimaryBtn } from "@/components/page-stub";

export const Route = createFileRoute("/_app/formations")({
  head: () => ({ meta: [{ title: "Formations — FIAD-Monde" }] }),
  component: () => (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        icon={<GraduationCap className="h-6 w-6" />}
        eyebrow="Formations"
        title="Cours & catalogue"
        subtitle="Cours hebdomadaires, formations continues et certifications."
        action={<PrimaryBtn>+ Nouvelle formation</PrimaryBtn>}
      />
      <div className="grid md:grid-cols-2 gap-4">
        {FORMATIONS.map((f) => (
          <Card key={f.id}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-primary font-bold">{f.status}</div>
                <h3 className="text-lg font-display font-bold mt-1">{f.title}</h3>
                <div className="text-sm text-muted-foreground mt-1">par {f.instructor}</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
                <GraduationCap className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-5 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" /> {f.schedule}</span>
              <span className="inline-flex items-center gap-1.5"><Users2 className="h-4 w-4" /> {f.attendees} inscrits</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  ),
});