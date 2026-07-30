import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Award, Inbox, Printer, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, PageHeader } from "@/components/page-stub";

export const Route = createFileRoute("/_app/mes-certificats")({
  head: () => ({
    meta: [
      { title: "Mes certificats — La PaDI" },
      { name: "description", content: "Retrouvez et imprimez les certificats de réussite obtenus à l'issue de vos formations La PaDI." },
      { property: "og:title", content: "Mes certificats — La PaDI" },
      { property: "og:description", content: "Certificats de réussite des formations La PaDI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CertificatesPage,
});

type Cert = {
  id: string; code: string; issued_at: string;
  holder_name: string | null; formation_title: string | null; user_id: string;
};

function CertificatesPage() {
  const { user, role } = useAuth();
  const isAdmin = role === "admin";
  const [items, setItems] = useState<Cert[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("certificates").select("*").order("issued_at", { ascending: false });
    const list = (data as Cert[]) ?? [];
    setItems(isAdmin ? list : list.filter((c) => c.user_id === user?.id));
    setLoading(false);
  }, [isAdmin, user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="max-w-[1100px] mx-auto">
      <PageHeader
        icon={<Award className="h-6 w-6" />}
        eyebrow="Certification"
        title={isAdmin ? "Certificats délivrés" : "Mes certificats"}
        subtitle="Certificats de réussite délivrés à l'issue des formations, avec code de vérification."
      />

      {loading ? (
        <Card><p className="text-sm text-muted-foreground">Chargement…</p></Card>
      ) : items.length === 0 ? (
        <Card>
          <div className="py-10 flex flex-col items-center justify-center text-center text-muted-foreground">
            <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center mb-3"><Inbox className="h-5 w-5" /></div>
            <p className="text-sm">Aucun certificat pour le moment.</p>
            <Link to="/formations" className="mt-4 text-sm text-primary font-semibold hover:underline">Découvrir les formations</Link>
          </div>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4 print:grid-cols-1">
          {items.map((c) => (
            <div key={c.id} className="rounded-2xl border-2 border-primary/30 bg-card p-6 text-center shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.2em] text-primary font-bold">La PaDI</p>
              <h3 className="text-xl font-display font-bold mt-2">Certificat de réussite</h3>
              <p className="text-xs text-muted-foreground mt-3">décerné à</p>
              <p className="text-lg font-display font-bold mt-1">{c.holder_name ?? "—"}</p>
              <p className="text-xs text-muted-foreground mt-3">pour la formation</p>
              <p className="text-base font-semibold text-primary mt-1">{c.formation_title ?? "—"}</p>
              <p className="text-xs text-muted-foreground mt-4">
                Délivré le {new Date(c.issued_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </p>
              <p className="text-xs mt-1">Code : <span className="font-mono font-semibold">{c.code}</span></p>
              <div className="mt-4 flex items-center justify-center gap-2 print:hidden">
                <button onClick={() => window.print()} className="h-9 px-4 rounded-full border border-border text-sm font-medium inline-flex items-center gap-1.5 hover:bg-secondary">
                  <Printer className="h-4 w-4" /> Imprimer
                </button>
                <Link to="/verifier-certificat" search={{ code: c.code }} className="h-9 px-4 rounded-full border border-border text-sm font-medium inline-flex items-center gap-1.5 hover:bg-secondary">
                  <ShieldCheck className="h-4 w-4" /> Vérifier
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}