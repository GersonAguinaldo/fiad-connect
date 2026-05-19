import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarDays, MapPin, Inbox } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, PageHeader, PrimaryBtn } from "@/components/page-stub";

export const Route = createFileRoute("/_app/evenements")({
  head: () => ({ meta: [{ title: "Événements — FIAD-Monde" }] }),
  component: EventsPage,
});

type Ev = { id: string; title: string; event_date: string; location: string | null; type: string | null; registrations?: number };

function EventsPage() {
  const [events, setEvents] = useState<Ev[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("events").select("id,title,event_date,location,type").order("event_date", { ascending: true });
      const list = (data as Ev[]) ?? [];
      if (list.length) {
        const { data: reg } = await supabase.from("event_registrations").select("event_id");
        const counts = new Map<string, number>();
        (reg ?? []).forEach((r: { event_id: string }) => counts.set(r.event_id, (counts.get(r.event_id) ?? 0) + 1));
        list.forEach((e) => (e.registrations = counts.get(e.id) ?? 0));
      }
      setEvents(list);
    })();
  }, []);

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader icon={<CalendarDays className="h-6 w-6" />} eyebrow="Événements" title="Calendrier & activités" subtitle="Sommets, cliniques, webinaires et sorties à venir." action={<PrimaryBtn>+ Nouvel événement</PrimaryBtn>} />
      {events.length === 0 ? (
        <Card><div className="py-10 flex flex-col items-center justify-center text-center text-muted-foreground"><div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center mb-3"><Inbox className="h-5 w-5" /></div><p className="text-sm">Aucun événement programmé.</p></div></Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((e) => {
            const d = new Date(e.event_date);
            return (
              <Card key={e.id}>
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-[oklch(0.45_0.22_265)] text-primary-foreground flex flex-col items-center justify-center">
                    <span className="text-[10px] uppercase font-bold">{d.toLocaleString("fr", { month: "short" })}</span>
                    <span className="text-xl font-extrabold leading-none">{d.getDate()}</span>
                  </div>
                  <div className="flex-1">
                    {e.type && <div className="text-xs uppercase tracking-wider text-primary font-bold">{e.type}</div>}
                    <h3 className="font-display font-bold mt-1 leading-tight">{e.title}</h3>
                    {e.location && <div className="text-sm text-muted-foreground mt-1 inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {e.location}</div>}
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{e.registrations ?? 0} inscrits</span>
                  <button className="text-primary font-semibold hover:underline">S'inscrire →</button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
