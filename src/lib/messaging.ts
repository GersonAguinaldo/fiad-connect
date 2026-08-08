import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notifications";

export type ConversationKind = "president" | "direct" | "group" | "forum" | "proximity";

export type Conversation = {
  id: string;
  kind: ConversationKind;
  title: string;
  description: string | null;
  subject: string | null;
  urgency: string;
  status: string;
  city: string | null;
  country: string | null;
  created_by: string | null;
  last_message_at: string;
  created_at: string;
};

export type Participant = {
  id: string;
  conversation_id: string;
  user_id: string;
  role: string;
  subscribed: boolean;
  last_read_at: string | null;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  on_behalf_of_presidency: boolean;
  created_at: string;
};

export type DirectoryMember = {
  id: string;
  full_name: string | null;
  city: string | null;
  country: string | null;
  avatar_url: string | null;
};

export const CHANNEL_LABEL: Record<ConversationKind, string> = {
  president: "Équipe Présidentielle",
  direct: "Messagerie interne",
  group: "Groupe de discussion",
  forum: "Forum thématique",
  proximity: "Réseau de proximité",
};

export const URGENCY_LABEL: Record<string, string> = {
  faible: "Faible",
  normale: "Normale",
  urgente: "Urgente",
};

export const STATUS_LABEL: Record<string, string> = {
  en_attente: "En attente",
  repondu: "Répondu",
  clos: "Clos",
};

export async function searchDirectory(q?: string, ids?: string[]): Promise<DirectoryMember[]> {
  const { data, error } = await supabase.rpc("directory_members", {
    _q: q ?? null,
    _ids: ids ?? null,
  } as never);
  if (error) return [];
  return (data as DirectoryMember[]) ?? [];
}

/** Envoie un message et notifie les autres participants. */
export async function sendMessage(input: {
  conversation: Conversation;
  senderId: string;
  body: string;
  onBehalfOfPresidency?: boolean;
  attachment?: { url: string; name: string; type: string } | null;
}) {
  const { error } = await supabase.from("messages").insert({
    conversation_id: input.conversation.id,
    sender_id: input.senderId,
    body: input.body,
    on_behalf_of_presidency: !!input.onBehalfOfPresidency,
    attachment_url: input.attachment?.url ?? null,
    attachment_name: input.attachment?.name ?? null,
    attachment_type: input.attachment?.type ?? null,
  } as never);
  if (error) throw error;

  const { data: parts } = await supabase
    .from("conversation_participants")
    .select("user_id, subscribed")
    .eq("conversation_id", input.conversation.id);

  const label =
    input.conversation.kind === "president"
      ? "Équipe Présidentielle"
      : `${CHANNEL_LABEL[input.conversation.kind]} – ${input.conversation.title}`;

  await Promise.all(
    ((parts as { user_id: string; subscribed: boolean }[]) ?? [])
      .filter((p) => p.user_id !== input.senderId && p.subscribed)
      .map((p) =>
        notify({
          userId: p.user_id,
          kind: "info",
          title: `Nouveau message – ${label}`,
          body: input.body.slice(0, 140),
          link: "/messages",
        }),
      ),
  );
}

export async function markRead(conversationId: string, userId: string) {
  await supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() } as never)
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
}

export function initials(name?: string | null) {
  const n = (name ?? "").trim();
  if (!n) return "??";
  return n
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

export function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const min = Math.round(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}