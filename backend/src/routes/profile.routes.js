import { Router } from "express";
import { Profile } from "../models/Profile.js";
import { User } from "../models/User.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

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
  const profile = await Profile.findByIdAndUpdate(req.params.id, { $set: update }, { new: true }).lean();
  res.json(profile);
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