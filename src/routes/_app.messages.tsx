import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { Card, PageHeader } from "@/components/page-stub";

export const Route = createFileRoute("/_app/messages")({
  head: () => ({ meta: [{ title: "Messages — La PaDI" }] }),
  component: () => (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader icon={<MessageSquare className="h-6 w-6" />} eyebrow="Communication" title="Messagerie interne" subtitle="Échangez avec le Président Mondial, les chargés de mission et votre groupe local." />
      <Card><p className="text-muted-foreground text-sm">Espace de messagerie en cours de mise en service.</p></Card>
    </div>
  ),
});