import { Router } from "express";
import { LiveSession, LiveSessionAttendee } from "../models/LiveSession.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// Liste des sessions (publique lecture pour visiteurs, mais on peut la
// restreindre plus tard). Tri du plus recent au plus ancien.
router.get("/", async (_req, res) => {
  res.json(await LiveSession.find().sort({ startsAt: -1 }).lean());
});

router.get("/upcoming", async (_req, res) => {
  res.json(
    await LiveSession.find({ startsAt: { $gte: new Date() }, status: { $ne: "annule" } })
      .sort({ startsAt: 1 })
      .lean(),
  );
});

router.get("/:id", async (req, res) => {
  const s = await LiveSession.findById(req.params.id).lean();
  if (!s) return res.status(404).json({ error: "Not found" });
  res.json(s);
});

router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const doc = await LiveSession.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json(doc);
});

router.patch("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const doc = await LiveSession.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
  res.json(doc);
});

router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  await LiveSession.findByIdAndDelete(req.params.id);
  await LiveSessionAttendee.deleteMany({ session: req.params.id });
  res.json({ ok: true });
});

// Inscription du membre courant a la session.
router.post("/:id/register", requireAuth, async (req, res) => {
  const att = await LiveSessionAttendee.findOneAndUpdate(
    { session: req.params.id, user: req.user._id },
    { $setOnInsert: { session: req.params.id, user: req.user._id } },
    { upsert: true, new: true },
  );
  res.json(att);
});

// Le membre marque sa presence quand il rejoint le direct.
router.post("/:id/join", requireAuth, async (req, res) => {
  const att = await LiveSessionAttendee.findOneAndUpdate(
    { session: req.params.id, user: req.user._id },
    { $set: { joinedAt: new Date() }, $setOnInsert: { session: req.params.id, user: req.user._id } },
    { upsert: true, new: true },
  );
  res.json(att);
});

// Liste des inscrits (admin).
router.get("/:id/attendees", requireAuth, requireRole("admin"), async (req, res) => {
  const list = await LiveSessionAttendee.find({ session: req.params.id })
    .populate("user", "email")
    .lean();
  res.json(list);
});

export default router;