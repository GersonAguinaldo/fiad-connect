import { Router } from "express";
import { Transaction } from "../models/Transaction.js";
import { User } from "../models/User.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { sendEmail } from "../emails/mailer.js";
import { templates } from "../emails/templates.js";

const PAID = ["paid", "Réussi", "Payé"];

/** Envoie le recu de paiement si la transaction est reglee. */
async function maybeSendReceipt(tx) {
  if (!tx || !PAID.includes(tx.status)) return;
  const user = await User.findById(tx.user).lean();
  if (!user?.email) return;
  void sendEmail({
    to: user.email,
    ...templates.receipt({
      reason: tx.reason,
      amount: tx.amount,
      currency: tx.currency,
      reference: tx.providerRef ?? tx._id?.toString(),
      occurredAt: tx.createdAt,
    }),
    meta: { transactionId: tx._id },
  });
}

const router = Router();

router.get("/", requireAuth, requireRole("admin"), async (_req, res) => {
  res.json(await Transaction.find().populate("user", "email").sort({ createdAt: -1 }).lean());
});

router.get("/me", requireAuth, async (req, res) => {
  res.json(await Transaction.find({ user: req.user._id }).sort({ createdAt: -1 }).lean());
});

router.post("/", requireAuth, async (req, res) => {
  const userId = req.user.roles.includes("admin") && req.body.user ? req.body.user : req.user._id;
  const tx = await Transaction.create({ ...req.body, user: userId });
  await maybeSendReceipt(tx);
  res.status(201).json(tx);
});

router.patch("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const before = await Transaction.findById(req.params.id).lean();
  const tx = await Transaction.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
  if (tx && !PAID.includes(before?.status)) await maybeSendReceipt(tx);
  res.json(tx);
});

router.post("/import", requireAuth, requireRole("admin"), async (req, res) => {
  const rows = Array.isArray(req.body) ? req.body : [];
  const docs = [];
  for (const row of rows) {
    if (!row.email) continue;
    const user = await User.findOne({ email: row.email.toLowerCase() });
    if (!user) continue;
    docs.push({ ...row, user: user._id });
  }
  const created = await Transaction.insertMany(docs, { ordered: false }).catch((e) => e.insertedDocs ?? []);
  res.json({ count: created.length });
});

export default router;