import { Router } from "express";
import { PresidencyHistory, PresidencyTeam } from "../models/Presidency.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

/** Etat courant : president en poste + equipe presidentielle. */
router.get("/", requireAuth, async (_req, res) => {
  const [current, team] = await Promise.all([
    PresidencyHistory.findOne({ endedAt: null }).lean(),
    PresidencyTeam.find().lean(),
  ]);
  res.json({ president: current?.user ?? null, team: team.map((t) => t.user) });
});

router.get("/history", requireAuth, requireRole("admin"), async (_req, res) => {
  res.json(await PresidencyHistory.find().sort({ startedAt: -1 }).lean());
});

/** Designe / transfere le role de President Mondial (unicite garantie par index). */
router.post("/president", requireAuth, requireRole("admin"), async (req, res) => {
  const { userId, note } = req.body ?? {};
  if (!userId) return res.status(400).json({ error: "userId requis" });
  await PresidencyHistory.updateMany(
    { endedAt: null },
    { $set: { endedAt: new Date(), revokedBy: req.user._id } },
  );
  const created = await PresidencyHistory.create({
    user: userId,
    assignedBy: req.user._id,
    note,
  });
  res.status(201).json(created);
});

router.delete("/president", requireAuth, requireRole("admin"), async (req, res) => {
  await PresidencyHistory.updateMany(
    { endedAt: null },
    { $set: { endedAt: new Date(), revokedBy: req.user._id } },
  );
  res.json({ ok: true });
});

router.post("/team", requireAuth, requireRole("admin"), async (req, res) => {
  const { userId } = req.body ?? {};
  if (!userId) return res.status(400).json({ error: "userId requis" });
  const doc = await PresidencyTeam.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId, addedBy: req.user._id } },
    { upsert: true, new: true },
  );
  res.status(201).json(doc);
});

router.delete("/team/:userId", requireAuth, requireRole("admin"), async (req, res) => {
  await PresidencyTeam.deleteOne({ user: req.params.userId });
  res.json({ ok: true });
});

export default router;