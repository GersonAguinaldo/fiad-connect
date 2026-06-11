import { Router } from "express";
import { Event, EventRegistration } from "../models/Event.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/", async (_req, res) => {
  const events = await Event.find().sort({ startsAt: -1 }).lean();
  res.json(events);
});

router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const event = await Event.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json(event);
});

router.patch("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const event = await Event.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
  res.json(event);
});

router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  await Event.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

router.post("/:id/register", requireAuth, async (req, res) => {
  const reg = await EventRegistration.findOneAndUpdate(
    { event: req.params.id, user: req.user._id },
    { $setOnInsert: { event: req.params.id, user: req.user._id, status: "inscrit" } },
    { upsert: true, new: true },
  );
  res.json(reg);
});

router.post("/import", requireAuth, requireRole("admin"), async (req, res) => {
  const rows = Array.isArray(req.body) ? req.body : [];
  const created = await Event.insertMany(rows, { ordered: false }).catch((e) => e.insertedDocs ?? []);
  res.json({ count: created.length });
});

export default router;