import { Router } from "express";
import { EventResource } from "../models/EventResource.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/", async (req, res) => {
  const filter = req.query.event ? { event: req.query.event } : {};
  res.json(await EventResource.find(filter).sort({ createdAt: -1 }).lean());
});

router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const doc = await EventResource.create({ ...req.body, uploadedBy: req.user._id });
  res.status(201).json(doc);
});

router.patch("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  res.json(await EventResource.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true }));
});

router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  await EventResource.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;