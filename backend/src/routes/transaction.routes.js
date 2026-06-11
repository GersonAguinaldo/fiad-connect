import { Router } from "express";
import { Transaction } from "../models/Transaction.js";
import { User } from "../models/User.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

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
  res.status(201).json(tx);
});

router.patch("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  res.json(await Transaction.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true }));
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