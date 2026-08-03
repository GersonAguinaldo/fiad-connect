import { Router } from "express";
import { Profile } from "../models/Profile.js";
import { User } from "../models/User.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { MemberStatusHistory } from "../models/MemberStatusHistory.js";
import { changeMemberStatus, applyMembershipStatusRules } from "../utils/membership-status.js";

const router = Router();

router.get("/", requireAuth, requireRole("admin"), async (_req, res) => {
  const profiles = await Profile.find().populate("user", "email roles createdAt").lean();
  res.json(profiles);
});

router.get("/me", requireAuth, async (req, res) => {
  const profile = await Profile.findOne({ user: req.user._id }).lean();
  res.json(profile);
});

router.patch("/me", requireAuth, async (req, res) => {
  const update = req.body ?? {};
  delete update.user;
  const profile = await Profile.findOneAndUpdate(
    { user: req.user._id },
    { $set: update },
    { new: true, upsert: true },
  ).lean();
  res.json(profile);
});

router.patch("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const update = req.body ?? {};
  delete update.user;
  delete update.status;
  const profile = await Profile.findByIdAndUpdate(req.params.id, { $set: update }, { new: true }).lean();
  res.json(profile);
});

router.get("/:id/status-history", requireAuth, async (req, res) => {
  const profile = await Profile.findById(req.params.id).lean();
  if (!profile) return res.status(404).json({ error: "Not found" });
  const isOwner = profile.user?.toString() === req.user._id.toString();
  if (!isOwner && !req.user.roles?.includes("admin")) return res.status(403).json({ error: "Forbidden" });
  res.json(await MemberStatusHistory.find({ profile: profile._id }).sort({ createdAt: -1 }).lean());
});

router.patch("/:id/status", requireAuth, requireRole("admin"), async (req, res) => {
  const { status, reason } = req.body ?? {};
  if (!status || !reason) return res.status(400).json({ error: "Statut et motif obligatoires" });
  const profile = await Profile.findById(req.params.id);
  if (!profile) return res.status(404).json({ error: "Not found" });
  await changeMemberStatus(profile, status, { reason, changedBy: req.user._id });
  res.json(profile);
});

router.post("/status-rules/run", requireAuth, requireRole("admin"), async (_req, res) => {
  res.json(await applyMembershipStatusRules());
});

router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const profile = await Profile.findById(req.params.id);
  if (!profile) return res.status(404).json({ error: "Not found" });
  await User.findByIdAndDelete(profile.user);
  await profile.deleteOne();
  res.json({ ok: true });
});

router.post("/import", requireAuth, requireRole("admin"), async (req, res) => {
  const rows = Array.isArray(req.body) ? req.body : [];
  const created = [];
  for (const row of rows) {
    if (!row.email) continue;
    let user = await User.findOne({ email: row.email.toLowerCase() });
    if (!user) {
      user = await User.create({ email: row.email, passwordHash: "imported", roles: ["membre"] });
    }
    const profile = await Profile.findOneAndUpdate(
      { user: user._id },
      { $set: { ...row, user: user._id } },
      { new: true, upsert: true },
    );
    created.push(profile);
  }
  res.json({ count: created.length });
});

export default router;