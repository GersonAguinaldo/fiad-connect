import { supabase } from "@/integrations/supabase/client";

export type NotificationKind = "info" | "statut" | "relance" | "paiement" | "bienvenue";

export type AppNotification = {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

/** Cree une notification interne (visible dans la cloche). Ne jette jamais. */
export async function notify(input: {
  userId: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  link?: string;
}) {
  try {
    await supabase.from("notifications").insert({
      user_id: input.userId,
      kind: input.kind,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
    });
  } catch {
    /* la notification ne doit jamais bloquer le parcours */
  }
}