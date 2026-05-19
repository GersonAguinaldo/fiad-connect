import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { TRANSACTIONS } from "@/lib/mock-data";
import { Card, PageHeader, PrimaryBtn } from "@/components/page-stub";

export const Route = createFileRoute("/_app/finances")({
  head: () => ({ meta: [{ title: "Finances — FIAD-Monde" }] }),
  component: () => (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader icon={<Wallet className="h-6 w-6" />} eyebrow="Finances" title="Paiements & cotisations" subtitle="Suivi transparent des transactions." action={<PrimaryBtn>+ Encaisser</PrimaryBtn>} />
      <Card>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-muted-foreground"><tr className="text-left">{["ID","Membre","Motif","Montant","Mode","Date","Statut"].map(h=> <th key={h} className="py-2">{h}</th>)}</tr></thead>
          <tbody>{TRANSACTIONS.map(t=> (
            <tr key={t.id} className="border-t border-border">
              <td className="py-3 text-muted-foreground">{t.id}</td>
              <td className="py-3 font-medium">{t.member}</td>
              <td className="py-3">{t.reason}</td>
              <td className="py-3 tabular-nums font-semibold">{t.amount}</td>
              <td className="py-3 text-muted-foreground">{t.method}</td>
              <td className="py-3 text-muted-foreground">{t.date}</td>
              <td className="py-3"><span className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary-soft text-primary">{t.status}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </Card>
    </div>
  ),
});