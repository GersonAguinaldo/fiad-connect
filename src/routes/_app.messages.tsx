import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Crown,
  MessageSquare,
  Users,
  MapPin,
  Search,
  Send,
  Plus,
  Loader2,
  BellOff,
  Bell,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { usePresidency } from "@/hooks/use-presidency";
import { Card, PageHeader } from "@/components/page-stub";
import { Avatar } from "@/components/avatar";
import {
  CHANNEL_LABEL,
  STATUS_LABEL,
  URGENCY_LABEL,
  markRead,
  searchDirectory,
  sendMessage,
  timeAgo,
  type Conversation,
  type ConversationKind,
  type DirectoryMember,
  type Message,
  type Participant,
} from "@/lib/messaging";

export const Route = createFileRoute("/_app/messages")({
  head: () => ({
    meta: [
      { title: "Messagerie — La PaDI" },
      {
        name: "description",
        content:
          "Canal direct avec le Président Mondial, messagerie interne, forums thématiques et réseaux de proximité.",
      },
    ],
  }),
  component: MessagesPage,
});

type TabKey = "president" | "interne" | "forums" | "proximite";

const TABS: { key: TabKey; label: string; icon: React.ReactNode; kinds: ConversationKind[] }[] = [
  { key: "president", label: "Président Mondial", icon: <Crown className="h-4 w-4" />, kinds: ["president"] },
  { key: "interne", label: "Messagerie interne", icon: <MessageSquare className="h-4 w-4" />, kinds: ["direct", "group"] },
  { key: "forums", label: "Forums", icon: <Users className="h-4 w-4" />, kinds: ["forum"] },
  { key: "proximite", label: "Proximité", icon: <MapPin className="h-4 w-4" />, kinds: ["proximity"] },
];

function MessagesPage() {
  const { user, role } = useAuth();
  const presidency = usePresidency();
  const isAdmin = role === "admin";
  const canModerate = isAdmin || presidency.isPresidency;

  const [tab, setTab] = useState<TabKey>("president");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [myParts, setMyParts] = useState<Participant[]>([]);
  const [people, setPeople] = useState<DirectoryMember[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [composer, setComposer] = useState<null | TabKey>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const [{ data: convs }, { data: parts }, dir] = await Promise.all([
      supabase.from("conversations").select("*").order("last_message_at", { ascending: false }),
      supabase.from("conversation_participants").select("*").eq("user_id", user.id),
      searchDirectory(),
    ]);
    setConversations((convs as Conversation[]) ?? []);
    setMyParts((parts as Participant[]) ?? []);
    setPeople(dir);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  // Adhésion automatique aux réseaux de proximité correspondant à ma localisation
  useEffect(() => {
    if (!user || loading) return;
    const me = people.find((p) => p.id === user.id);
    if (!me) return;
    const norm = (v?: string | null) => (v ?? "").trim().toLowerCase();
    const targets = conversations.filter(
      (c) =>
        c.kind === "proximity" &&
        !myParts.some((p) => p.conversation_id === c.id) &&
        ((c.city && norm(c.city) === norm(me.city)) || (!c.city && c.country && norm(c.country) === norm(me.country))),
    );
    if (targets.length === 0) return;
    void (async () => {
      await supabase
        .from("conversation_participants")
        .insert(targets.map((c) => ({ conversation_id: c.id, user_id: user.id })) as never);
      void load();
    })();
  }, [user, loading, people, conversations, myParts, load]);

  const byId = useMemo(() => {
    const m: Record<string, DirectoryMember> = {};
    for (const p of people) m[p.id] = p;
    return m;
  }, [people]);
  const nameOf = (id: string) => byId[id]?.full_name || "Membre";

  const partOf = useCallback(
    (convId: string) => myParts.find((p) => p.conversation_id === convId) ?? null,
    [myParts],
  );

  const unread = useCallback(
    (c: Conversation) => {
      const p = partOf(c.id);
      if (!p) return false;
      return !p.last_read_at || new Date(p.last_read_at) < new Date(c.last_message_at);
    },
    [partOf],
  );

  const term = q.trim().toLowerCase();
  const visible = useMemo(() => {
    const kinds = TABS.find((t) => t.key === tab)!.kinds;
    return conversations.filter((c) => {
      if (!kinds.includes(c.kind)) return false;
      if (c.kind === "president" && !presidency.isPresidency && !partOf(c.id)) return false;
      if ((c.kind === "direct" || c.kind === "group") && !partOf(c.id)) return false;
      if (!term) return true;
      return [c.title, c.subject, c.description, c.city, c.country]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [conversations, tab, term, partOf, presidency.isPresidency]);

  const active = conversations.find((c) => c.id === activeId) ?? null;

  const loadMessages = useCallback(
    async (convId: string) => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", convId)
        .order("created_at");
      setMessages((data as Message[]) ?? []);
      if (user) {
        await markRead(convId, user.id);
        setMyParts((prev) =>
          prev.map((p) => (p.conversation_id === convId ? { ...p, last_read_at: new Date().toISOString() } : p)),
        );
      }
    },
    [user],
  );

  useEffect(() => {
    if (!activeId) return;
    void loadMessages(activeId);
    const channel = supabase
      .channel(`conv-${activeId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeId}` }, () => {
        void loadMessages(activeId);
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!active || !user || !draft.trim()) return;
    setSending(true);
    try {
      await sendMessage({
        conversation: active,
        senderId: user.id,
        body: draft.trim(),
        onBehalfOfPresidency: active.kind === "president" && presidency.isPresidency,
      });
      setDraft("");
      await loadMessages(active.id);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Envoi impossible");
    } finally {
      setSending(false);
    }
  }

  async function toggleSubscribe(c: Conversation) {
    if (!user) return;
    const p = partOf(c.id);
    if (!p) {
      const { error } = await supabase
        .from("conversation_participants")
        .insert({ conversation_id: c.id, user_id: user.id } as never);
      if (error) return toast.error(error.message);
      toast.success("Sujet suivi");
    } else {
      const { error } = await supabase
        .from("conversation_participants")
        .update({ subscribed: !p.subscribed } as never)
        .eq("id", p.id);
      if (error) return toast.error(error.message);
      toast.success(p.subscribed ? "Notifications désactivées" : "Sujet suivi");
    }
    void load();
  }

  async function setStatus(c: Conversation, status: string) {
    const { error } = await supabase.from("conversations").update({ status } as never).eq("id", c.id);
    if (error) return toast.error(error.message);
    void load();
  }

  if (loading) {
    return (
      <div className="p-8 text-muted-foreground inline-flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement de la messagerie…
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        icon={<MessageSquare className="h-6 w-6" />}
        eyebrow="Communication & interactions"
        title="Messagerie"
        subtitle="Canal Présidence, messagerie interne, forums thématiques et réseaux de proximité."
        action={
          <button
            onClick={() => setComposer(tab)}
            className="h-10 px-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Nouveau
          </button>
        }
      />

      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3">
        {TABS.map((t) => {
          const kinds = t.kinds;
          const count = conversations.filter(
            (c) => kinds.includes(c.kind) && unread(c) && (c.kind !== "president" || presidency.isPresidency || partOf(c.id)),
          ).length;
          return (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key);
                setActiveId(null);
              }}
              className={
                "h-9 px-3 rounded-full text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap border " +
                (tab === t.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:text-foreground")
              }
            >
              {t.icon}
              {t.label}
              {count > 0 && (
                <span className="h-5 min-w-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[11px] inline-flex items-center justify-center">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-[340px_minmax(0,1fr)] gap-4">
        {/* Liste des conversations */}
        <div className={(activeId ? "hidden lg:block " : "") + "space-y-3"}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher une conversation…"
              className="w-full h-10 pl-10 pr-4 rounded-lg bg-card border border-border focus:border-ring focus:outline-none text-sm"
            />
          </div>
          <Card className="p-0 overflow-hidden">
            <ul className="divide-y divide-border max-h-[32rem] overflow-auto">
              {visible.length === 0 && (
                <li className="p-4 text-sm text-muted-foreground">
                  {tab === "president"
                    ? "Aucune demande. Utilisez « Nouveau » pour écrire à la Présidence."
                    : "Aucune conversation dans cette section."}
                </li>
              )}
              {visible.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setActiveId(c.id)}
                    className={
                      "w-full text-left p-3 hover:bg-secondary transition-colors " +
                      (activeId === c.id ? "bg-secondary" : "")
                    }
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold truncate">{c.title}</span>
                          {unread(c) && <span className="h-2 w-2 rounded-full bg-destructive shrink-0" />}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {c.subject || c.description || CHANNEL_LABEL[c.kind]}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
                          <span>{timeAgo(c.last_message_at)}</span>
                          {c.kind === "president" && (
                            <>
                              <span className="px-1.5 py-0.5 rounded-full bg-primary-soft text-primary font-semibold">
                                {STATUS_LABEL[c.status] ?? c.status}
                              </span>
                              {c.urgency === "urgente" && (
                                <span className="px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive font-semibold">
                                  Urgent
                                </span>
                              )}
                            </>
                          )}
                          {(c.city || c.country) && (
                            <span className="px-1.5 py-0.5 rounded-full bg-secondary">
                              {[c.city, c.country].filter(Boolean).join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Fil de discussion */}
        <div className={activeId ? "" : "hidden lg:block"}>
          {!active ? (
            <Card>
              <p className="text-sm text-muted-foreground">Sélectionnez une conversation pour l'afficher.</p>
            </Card>
          ) : (
            <Card className="p-0 flex flex-col h-[32rem]">
              <div className="p-3 sm:p-4 border-b border-border flex items-center gap-2 flex-wrap">
                <button onClick={() => setActiveId(null)} className="lg:hidden h-9 w-9 rounded-lg hover:bg-secondary inline-flex items-center justify-center">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="font-display font-bold truncate">{active.title}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {CHANNEL_LABEL[active.kind]}
                    {active.subject ? ` · ${active.subject}` : ""}
                    {active.kind === "president" ? ` · ${URGENCY_LABEL[active.urgency] ?? active.urgency}` : ""}
                  </div>
                </div>
                {(active.kind === "forum" || active.kind === "proximity") && (
                  <button
                    onClick={() => toggleSubscribe(active)}
                    className="h-9 px-3 rounded-lg border border-border text-sm font-semibold inline-flex items-center gap-1.5"
                  >
                    {partOf(active.id)?.subscribed ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                    {partOf(active.id)?.subscribed ? "Ne plus suivre" : "Suivre"}
                  </button>
                )}
                {active.kind === "president" && presidency.isPresidency && (
                  <select
                    value={active.status}
                    onChange={(e) => setStatus(active, e.target.value)}
                    className="h-9 px-2 rounded-lg bg-card border border-border text-sm"
                  >
                    <option value="en_attente">En attente</option>
                    <option value="repondu">Répondu</option>
                    <option value="clos">Clos</option>
                  </select>
                )}
              </div>

              <div className="flex-1 overflow-auto p-3 sm:p-4 space-y-3">
                {messages.length === 0 && (
                  <p className="text-sm text-muted-foreground">Aucun message pour le moment.</p>
                )}
                {messages.map((m) => {
                  const mine = m.sender_id === user?.id;
                  const fromPresidency = m.on_behalf_of_presidency;
                  const author = fromPresidency && !presidency.isPresidency && !isAdmin ? "La Présidence" : nameOf(m.sender_id);
                  return (
                    <div key={m.id} className={"flex gap-2 " + (mine ? "justify-end" : "")}>
                      {!mine && <Avatar name={author} />}
                      <div className={"max-w-[80%] " + (mine ? "text-right" : "")}>
                        <div className="text-[11px] text-muted-foreground mb-0.5 inline-flex items-center gap-1">
                          {fromPresidency && <ShieldCheck className="h-3 w-3 text-primary" />}
                          {author}
                          {fromPresidency && (presidency.isPresidency || isAdmin) && " (au nom de la Présidence)"}
                          {" · "}
                          {timeAgo(m.created_at)}
                        </div>
                        <div
                          className={
                            "rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words " +
                            (mine ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground")
                          }
                        >
                          {m.body}
                          {m.attachment_url && (
                            <a
                              href={m.attachment_url}
                              target="_blank"
                              rel="noreferrer"
                              className="block mt-1 underline text-xs"
                            >
                              {m.attachment_name ?? "Pièce jointe"}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <div className="p-3 border-t border-border flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={2}
                  placeholder="Écrire un message…"
                  className="flex-1 rounded-lg bg-card border border-border px-3 py-2 text-sm resize-none focus:border-ring focus:outline-none"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !draft.trim()}
                  className="h-10 px-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60"
                >
                  <Send className="h-4 w-4" /> Envoyer
                </button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {composer && (
        <Composer
          tab={composer}
          people={people.filter((p) => p.id !== user?.id)}
          canModerate={canModerate}
          onClose={() => setComposer(null)}
          onCreated={(id) => {
            setComposer(null);
            void load().then(() => setActiveId(id));
          }}
          userId={user?.id ?? ""}
        />
      )}
    </div>
  );
}

function Composer({
  tab,
  people,
  canModerate,
  userId,
  onClose,
  onCreated,
}: {
  tab: TabKey;
  people: DirectoryMember[];
  canModerate: boolean;
  userId: string;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [urgency, setUrgency] = useState("normale");
  const [body, setBody] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);

  const needsModeration = tab === "forums" || tab === "proximite";
  const kind: ConversationKind =
    tab === "president" ? "president" : tab === "forums" ? "forum" : tab === "proximite" ? "proximity" : selected.length > 1 ? "group" : "direct";

  async function create() {
    if (needsModeration && !canModerate) {
      toast.error("Seuls les administrateurs et la Présidence peuvent créer ce type d'espace.");
      return;
    }
    if (tab === "interne" && selected.length === 0) return toast.error("Choisissez au moins un destinataire.");
    if (tab === "president" && !subject.trim()) return toast.error("Indiquez le sujet de votre demande.");
    if (needsModeration && !title.trim()) return toast.error("Indiquez un titre.");

    setSaving(true);
    const computedTitle =
      tab === "president"
        ? subject.trim()
        : tab === "interne"
          ? title.trim() ||
            selected.map((id) => people.find((p) => p.id === id)?.full_name ?? "Membre").join(", ")
          : title.trim();

    const { data, error } = await supabase
      .from("conversations")
      .insert({
        kind,
        title: computedTitle,
        subject: tab === "president" ? subject.trim() : null,
        urgency: tab === "president" ? urgency : "normale",
        description: needsModeration ? body.trim() || null : null,
        city: tab === "proximite" ? city.trim() || null : null,
        country: tab === "proximite" ? country.trim() || null : null,
        created_by: userId,
      } as never)
      .select("id")
      .single();
    if (error || !data) {
      setSaving(false);
      return toast.error(error?.message ?? "Création impossible");
    }
    const convId = (data as { id: string }).id;

    const participants = [{ conversation_id: convId, user_id: userId }].concat(
      tab === "interne" ? selected.map((id) => ({ conversation_id: convId, user_id: id })) : [],
    );
    await supabase.from("conversation_participants").insert(participants as never);

    if (body.trim() && !needsModeration) {
      await supabase.from("messages").insert({
        conversation_id: convId,
        sender_id: userId,
        body: body.trim(),
      } as never);
    }
    setSaving(false);
    toast.success("Conversation créée");
    onCreated(convId);
  }

  const term = q.trim().toLowerCase();
  const list = people.filter((p) => !term || (p.full_name ?? "").toLowerCase().includes(term));

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-card w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-border p-4 sm:p-6 max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display font-bold text-lg mb-4">
          {tab === "president"
            ? "Nouvelle demande à la Présidence"
            : tab === "interne"
              ? "Nouvelle conversation"
              : tab === "forums"
                ? "Nouveau forum thématique"
                : "Nouveau réseau de proximité"}
        </h2>

        <div className="space-y-3">
          {tab === "president" && (
            <>
              <Field label="Sujet de la demande">
                <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} placeholder="Conseil personnalisé, stratégie locale…" />
              </Field>
              <Field label="Degré d'urgence">
                <select value={urgency} onChange={(e) => setUrgency(e.target.value)} className={inputCls}>
                  <option value="faible">Faible</option>
                  <option value="normale">Normale</option>
                  <option value="urgente">Urgente</option>
                </select>
              </Field>
            </>
          )}

          {tab === "interne" && (
            <>
              <Field label="Titre (optionnel pour un groupe)">
                <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="Coordination événement Libreville" />
              </Field>
              <Field label="Destinataires">
                <input value={q} onChange={(e) => setQ(e.target.value)} className={inputCls} placeholder="Rechercher un membre…" />
                <ul className="mt-2 max-h-48 overflow-auto divide-y divide-border border border-border rounded-lg">
                  {list.map((p) => (
                    <li key={p.id} className="flex items-center gap-2 p-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selected.includes(p.id)}
                        onChange={() =>
                          setSelected((s) => (s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id]))
                        }
                      />
                      <span className="truncate flex-1">{p.full_name || "Membre"}</span>
                      <span className="text-xs text-muted-foreground truncate">{[p.city, p.country].filter(Boolean).join(", ")}</span>
                    </li>
                  ))}
                  {list.length === 0 && <li className="p-2 text-sm text-muted-foreground">Aucun membre.</li>}
                </ul>
              </Field>
            </>
          )}

          {needsModeration && (
            <>
              <Field label={tab === "forums" ? "Titre du sujet" : "Nom du groupe local"}>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder={tab === "forums" ? "Santé & bien-être" : "Groupe local Libreville"} />
              </Field>
              <Field label="Description">
                <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} className={textareaCls} />
              </Field>
              {tab === "proximite" && (
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Ville">
                    <input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} placeholder="Libreville" />
                  </Field>
                  <Field label="Pays">
                    <input value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls} placeholder="Gabon" />
                  </Field>
                </div>
              )}
              {!canModerate && (
                <p className="text-xs text-destructive">
                  Seuls les administrateurs et l'Équipe Présidentielle peuvent créer cet espace.
                </p>
              )}
            </>
          )}

          {!needsModeration && (
            <Field label="Message">
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} className={textareaCls} placeholder="Décrivez clairement votre besoin…" />
            </Field>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="h-10 px-4 rounded-full border border-border text-sm font-semibold">
            Annuler
          </button>
          <button
            onClick={create}
            disabled={saving}
            className="h-10 px-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
          >
            {saving ? "Création…" : "Créer"}
          </button>
        </div>
      </div>
    </div>
  );
}

const textareaCls = "w-full px-3 py-2 rounded-lg bg-card border border-border text-sm resize-none focus:border-ring focus:outline-none";
const inputCls = "w-full h-10 px-3 rounded-lg bg-card border border-border text-sm focus:border-ring focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm font-medium mb-1">{label}</div>
      {children}
    </div>
  );
}