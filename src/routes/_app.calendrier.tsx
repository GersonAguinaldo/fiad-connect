import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, PageHeader } from "@/components/page-stub";

export const Route = createFileRoute("/_app/calendrier")({
  head: () => ({ meta: [{ title: "Calendrier — FIAD-Monde" }] }),
  component: CalendarPage,
});

type Item = {
  id: string;
  title: string;
  date: string;
  kind: "event" | "formation";
  location?: string | null;
  type?: string | null;
  price?: number;
  currency?: string;
};

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function addMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function sameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
const WD = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

function CalendarPage() {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<Date>(new Date());
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: ev }, { data: fm }] = await Promise.all([
        supabase.from("events").select("id,title,event_date,location,type,price,currency").order("event_date", { ascending: true }),
        supabase.from("formations").select("id,title,starts_on,type"),
      ]);
      const list: Item[] = [];
      (ev ?? []).forEach((e: { id: string; title: string; event_date: string; location: string | null; type: string | null; price: number; currency: string }) => {
        list.push({ id: e.id, title: e.title, date: e.event_date, kind: "event", location: e.location, type: e.type, price: e.price, currency: e.currency });
      });
      (fm as { id: string; title: string; starts_on: string | null; type: string }[] | null ?? []).forEach((f) => {
        if (f.starts_on) list.push({ id: f.id, title: f.title, date: f.starts_on, kind: "formation", type: f.type });
      });
      setItems(list);
    })();
  }, []);

  const cells = useMemo(() => {
    const first = startOfMonth(cursor);
    const offset = (first.getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const arr: { date: Date; inMonth: boolean }[] = [];
    for (let i = 0; i < offset; i++) {
      const d = new Date(first); d.setDate(d.getDate() - (offset - i));
      arr.push({ date: d, inMonth: false });
    }
    for (let i = 1; i <= daysInMonth; i++) arr.push({ date: new Date(cursor.getFullYear(), cursor.getMonth(), i), inMonth: true });
    while (arr.length % 7 !== 0) {
      const last = arr[arr.length - 1].date; const d = new Date(last); d.setDate(d.getDate() + 1);
      arr.push({ date: d, inMonth: false });
    }
    return arr;
  }, [cursor]);

  const byDay = useMemo(() => {
    const map = new Map<string, Item[]>();
    items.forEach((it) => {
      const d = new Date(it.date); const k = d.toDateString();
      const arr = map.get(k) ?? []; arr.push(it); map.set(k, arr);
    });
    return map;
  }, [items]);

  const dayItems = byDay.get(selected.toDateString()) ?? [];

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        icon={<CalendarDays className="h-6 w-6" />}
        eyebrow="Activités"
        title="Calendrier"
        subtitle="Vue mensuelle interactive — événements et formations."
      />
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCursor(addMonths(cursor, -1))} className="h-9 w-9 rounded-lg hover:bg-secondary inline-flex items-center justify-center"><ChevronLeft className="h-4 w-4" /></button>
            <div className="font-display font-bold text-lg">{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</div>
            <button onClick={() => setCursor(addMonths(cursor, 1))} className="h-9 w-9 rounded-lg hover:bg-secondary inline-flex items-center justify-center"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground mb-1">
            {WD.map((w) => <div key={w} className="py-2">{w}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map(({ date, inMonth }, i) => {
              const k = date.toDateString();
              const dayHas = byDay.get(k) ?? [];
              const isSel = sameDay(date, selected);
              const isToday = sameDay(date, new Date());
              return (
                <button
                  key={i}
                  onClick={() => setSelected(date)}
                  className={
                    "aspect-square rounded-lg p-1.5 text-sm flex flex-col items-center justify-start gap-1 border transition " +
                    (isSel ? "bg-primary text-primary-foreground border-primary" : "border-transparent hover:bg-secondary ") +
                    (!inMonth ? " opacity-30" : "")
                  }
                >
                  <span className={"text-xs font-semibold " + (isToday && !isSel ? "text-primary" : "")}>{date.getDate()}</span>
                  {dayHas.length > 0 && (
                    <span className="flex gap-0.5">
                      {dayHas.slice(0, 3).map((it, j) => (
                        <span key={j} className={"h-1.5 w-1.5 rounded-full " + (isSel ? "bg-primary-foreground" : it.kind === "event" ? "bg-primary" : "bg-emerald-500")} />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{selected.toLocaleDateString("fr-FR", { weekday: "long" })}</div>
          <div className="font-display font-extrabold text-2xl">{selected.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</div>
          <div className="mt-5 space-y-3">
            {dayItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune activité ce jour.</p>
            ) : dayItems.map((it) => (
              <Link key={it.kind + it.id} to={it.kind === "event" ? "/evenements" : "/formations"} className="block rounded-xl border border-border p-3 hover:border-primary transition">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold">
                  {it.kind === "event" ? <span className="bg-primary-soft text-primary px-2 py-0.5 rounded-full">Événement{it.type ? ` • ${it.type}` : ""}</span>
                    : <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full inline-flex items-center gap-1"><GraduationCap className="h-3 w-3" /> Formation{it.type ? ` • ${it.type}` : ""}</span>}
                  {it.kind === "event" && (it.price ?? 0) > 0 && <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">{it.price} {it.currency}</span>}
                </div>
                <div className="font-display font-bold mt-1">{it.title}</div>
                {it.kind === "event" && <div className="text-xs text-muted-foreground mt-1">{new Date(it.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}{it.location ? ` • ${it.location}` : ""}</div>}
              </Link>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-border flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> Événement</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Formation</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
