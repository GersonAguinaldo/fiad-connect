import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GraduationCap, Users2, Clock, Inbox } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, PageHeader, PrimaryBtn } from "@/components/page-stub";

export const Route = createFileRoute("/_app/formations")({
  head: () => ({ meta: [{ title: "Formations — FIAD-Monde" }] }),
  component: FormationsPage,
});

type Formation = { id: string; title: string; instructor: string | null; schedule: string | null; status: string; attendees?: number };

function FormationsPage() {
  const [items, setItems] = useState<Formation[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("formations").select("id,title,instructor,schedule,status").order("created_at", { ascending: false });
      const list = (data as Formation[]) ?? [];
      if (list.length) {
        const { data: enr } = await supabase.from("formation_enrollments").select("formation_id");
        const counts = new Map<string, number>();
        (enr ?? []).forEach((e: { formation_id: string }) => counts.set(e.formation_id, (counts.get(e.formation_id) ?? 0) + 1));
        list.forEach((f) => (f.attendees = counts.get(f.id) ?? 0));
      }
      setItems(list);
    })();
  }, []);

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader icon={<GraduationCap className="h-6 w-6" />} eyebrow="Formations" title="Cours & catalogue" subtitle="Cours hebdomadaires, formations continues et certifications." action={<PrimaryBtn>+ Nouvelle formation</PrimaryBtn>} />
      {items.length === 0 ? (
        <Card><div className="py-10 flex flex-col items-center justify-center text-center text-muted-foreground"><div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center mb-3"><Inbox className="h-5 w-5" /></div><p className="text-sm">Aucune formation publiée pour l'instant.</p></div></Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {items.map((f) => (
            <Card key={f.id}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-primary font-bold">{f.status}</div>
                  <h3 className="text-lg font-display font-bold mt-1">{f.title}</h3>
                  {f.instructor && <div className="text-sm text-muted-foreground mt-1">par {f.instructor}</div>}
                </div>
                <div className="h-10 w-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center"><GraduationCap className="h-5 w-5" /></div>
              </div>
              <div className="mt-4 flex items-center gap-5 text-sm text-muted-foreground">
                {f.schedule && <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" /> {f.schedule}</span>}
                <span className="inline-flex items-center gap-1.5"><Users2 className="h-4 w-4" /> {f.attendees ?? 0} inscrits</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
