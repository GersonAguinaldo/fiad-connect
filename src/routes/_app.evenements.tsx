import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, MapPin } from "lucide-react";
import { EVENTS } from "@/lib/mock-data";
import { Card, PageHeader, PrimaryBtn } from "@/components/page-stub";

export const Route = createFileRoute("/_app/evenements")({
  head: () => ({ meta: [{ title: "Événements — FIAD-Monde" }] }),
  component: () => (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        icon={<CalendarDays className="h-6 w-6" />}
        eyebrow="Événements"
        title="Calendrier & activités"
        subtitle="Sommets, cliniques, webinaires et sorties à venir."
        action={<PrimaryBtn>+ Nouvel événement</PrimaryBtn>}
      />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {EVENTS.map((e) => {
          const d = new Date(e.date);
          return (
            <Card key={e.id}>
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-[oklch(0.45_0.22_265)] text-primary-foreground flex flex-col items-center justify-center">
                  <span className="text-[10px] uppercase font-bold">{d.toLocaleString("fr", { month: "short" })}</span>
                  <span className="text-xl font-extrabold leading-none">{d.getDate()}</span>
                </div>
                <div className="flex-1">
                  <div className="text-xs uppercase tracking-wider text-primary font-bold">{e.type}</div>
                  <h3 className="font-display font-bold mt-1 leading-tight">{e.title}</h3>
                  <div className="text-sm text-muted-foreground mt-1 inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {e.location}</div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{e.registrations} inscrits</span>
                <button className="text-primary font-semibold hover:underline">S'inscrire →</button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  ),
});