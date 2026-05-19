import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wallet, Inbox } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, PageHeader, PrimaryBtn } from "@/components/page-stub";

export const Route = createFileRoute("/_app/finances")({
  head: () => ({ meta: [{ title: "Finances — FIAD-Monde" }] }),
  component: FinancesPage,
});

type Tx = { id: string; user_id: string; reason: string; amount: number; currency: string; method: string | null; status: string; occurred_at: string; member_name?: string };

function FinancesPage() {
  const [txs, setTxs] = useState<Tx[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("transactions").select("*").order("occurred_at", { ascending: false });
      const list = (data as Tx[]) ?? [];
      if (list.length) {
        const ids = Array.from(new Set(list.map((t) => t.user_id)));
        const { data: profs } = await supabase.from("profiles").select("id,first_name,last_name,email").in("id", ids);
        const byId = new Map((profs ?? []).map((p) => [p.id, [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "Membre"]));
        list.forEach((t) => (t.member_name = byId.get(t.user_id) ?? "Membre"));
      }
      setTxs(list);
    })();
  }, []);

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader icon={<Wallet className="h-6 w-6" />} eyebrow="Finances" title="Paiements & cotisations" subtitle="Suivi transparent des transactions." action={<PrimaryBtn>+ Encaisser</PrimaryBtn>} />
      <Card>
        {txs.length === 0 ? (
          <div className="py-10 flex flex-col items-center justify-center text-center text-muted-foreground"><div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center mb-3"><Inbox className="h-5 w-5" /></div><p className="text-sm">Aucune transaction enregistrée.</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground"><tr className="text-left">{["Membre","Motif","Montant","Mode","Date","Statut"].map(h => <th key={h} className="py-2">{h}</th>)}</tr></thead>
            <tbody>{txs.map(t => (
              <tr key={t.id} className="border-t border-border">
                <td className="py-3 font-medium">{t.member_name}</td>
                <td className="py-3">{t.reason}</td>
                <td className="py-3 tabular-nums font-semibold">{new Intl.NumberFormat("fr-FR").format(Number(t.amount))} {t.currency}</td>
                <td className="py-3 text-muted-foreground">{t.method ?? "—"}</td>
                <td className="py-3 text-muted-foreground">{new Date(t.occurred_at).toLocaleDateString("fr-FR")}</td>
                <td className="py-3"><span className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary-soft text-primary">{t.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
