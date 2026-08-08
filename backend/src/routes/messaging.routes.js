import { Router } from "express";
import { Conversation, ConversationParticipant, Message } from "../models/Messaging.js";
import { PresidencyHistory, PresidencyTeam } from "../models/Presidency.js";
import { Notification } from "../models/Notification.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const CHANNEL_LABEL = {
  president: "Equipe Presidentielle",
  direct: "Messagerie interne",
  group: "Groupe de discussion",
  forum: "Forum thematique",
  proximity: "Reseau de proximite",
};

async function isPresidency(userId) {
  const [pres, team] = await Promise.all([
    PresidencyHistory.findOne({ endedAt: null, user: userId }).lean(),
    PresidencyTeam.findOne({ user: userId }).lean(),
  ]);
  return !!pres || !!team;
}

async function canRead(conv, userId) {
  if (!conv) return false;
  if (conv.kind === "forum" || conv.kind === "proximity") return true;
  const part = await ConversationParticipant.findOne({ conversation: conv._id, user: userId }).lean();
  if (part) return true;
  return conv.kind === "president" && (await isPresidency(userId));
}

/** Liste des conversations visibles + etat de lecture. */
router.get("/conversations", requireAuth, async (req, res) => {
  const presidency = await isPresidency(req.user._id);
  const parts = await ConversationParticipant.find({ user: req.user._id }).lean();
  const ids = parts.map((p) => p.conversation);
  const or = [{ _id: { $in: ids } }, { kind: { $in: ["forum", "proximity"] } }];
  if (presidency) or.push({ kind: "president" });
  const conversations = await Conversation.find({ $or: or }).sort({ lastMessageAt: -1 }).lean();
  res.json({ conversations, participants: parts });
});

router.post("/conversations", requireAuth, async (req, res) => {
  const { kind, title, description, subject, urgency, city, country, participants = [], body } = req.body ?? {};
  if (!kind || !title) return res.status(400).json({ error: "kind et title requis" });
  if (["forum", "proximity"].includes(kind)) {
    const allowed = req.user.roles?.includes("admin") || (await isPresidency(req.user._id));
    if (!allowed) return res.status(403).json({ error: "Forbidden" });
  }
  const conv = await Conversation.create({
    kind,
    title,
    description,
    subject,
    urgency,
    city,
    country,
    createdBy: req.user._id,
  });
  const users = [...new Set([req.user._id.toString(), ...participants.map(String)])];
  await ConversationParticipant.insertMany(users.map((u) => ({ conversation: conv._id, user: u })));
  if (body) {
    await Message.create({ conversation: conv._id, sender: req.user._id, body });
  }
  res.status(201).json(conv);
});

router.get("/conversations/:id/messages", requireAuth, async (req, res) => {
  const conv = await Conversation.findById(req.params.id).lean();
  if (!(await canRead(conv, req.user._id))) return res.status(403).json({ error: "Forbidden" });
  const messages = await Message.find({ conversation: conv._id }).sort({ createdAt: 1 }).lean();
  await ConversationParticipant.updateOne(
    { conversation: conv._id, user: req.user._id },
    { $set: { lastReadAt: new Date() } },
  );
  res.json(messages);
});

router.post("/conversations/:id/messages", requireAuth, async (req, res) => {
  const conv = await Conversation.findById(req.params.id);
  if (!(await canRead(conv, req.user._id))) return res.status(403).json({ error: "Forbidden" });
  const presidency = conv.kind === "president" && (await isPresidency(req.user._id));
  const message = await Message.create({
    conversation: conv._id,
    sender: req.user._id,
    body: req.body?.body,
    attachmentUrl: req.body?.attachmentUrl,
    attachmentName: req.body?.attachmentName,
    attachmentType: req.body?.attachmentType,
    onBehalfOfPresidency: presidency,
  });
  conv.lastMessageAt = message.createdAt;
  if (conv.kind === "president") conv.status = presidency ? "repondu" : "en_attente";
  await conv.save();

  const label =
    conv.kind === "president" ? "Equipe Presidentielle" : `${CHANNEL_LABEL[conv.kind]} - ${conv.title}`;
  const others = await ConversationParticipant.find({
    conversation: conv._id,
    subscribed: true,
    user: { $ne: req.user._id },
  }).lean();
  await Notification.insertMany(
    others.map((p) => ({
      user: p.user,
      kind: "info",
      title: `Nouveau message - ${label}`,
      body: String(message.body).slice(0, 140),
      link: "/messages",
    })),
  );
  res.status(201).json(message);
});

/** Suivre / ne plus suivre un forum ou groupe de proximite. */
router.post("/conversations/:id/subscription", requireAuth, async (req, res) => {
  const subscribed = req.body?.subscribed !== false;
  const doc = await ConversationParticipant.findOneAndUpdate(
    { conversation: req.params.id, user: req.user._id },
    { $set: { subscribed } },
    { upsert: true, new: true },
  );
  res.json(doc);
});

router.patch("/conversations/:id", requireAuth, async (req, res) => {
  const conv = await Conversation.findById(req.params.id);
  if (!conv) return res.status(404).json({ error: "Not found" });
  const allowed = req.user.roles?.includes("admin") || (await isPresidency(req.user._id));
  if (!allowed) return res.status(403).json({ error: "Forbidden" });
  if (req.body?.status) conv.status = req.body.status;
  if (req.body?.title) conv.title = req.body.title;
  await conv.save();
  res.json(conv);
});

export default router;