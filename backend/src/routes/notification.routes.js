import { Router } from "express";
import { Notification } from "../models/Notification.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/me", requireAuth, async (req, res) => {
  res.json(
    await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50).lean(),
  );
});

router.post("/me/read-all", requireAuth, async (req, res) => {
  await Notification.updateMany(
    { user: req.user._id, readAt: null },
    { $set: { readAt: new Date() } },
  );
  res.json({ ok: true });
});

router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  res.status(201).json(await Notification.create(req.body));
});

export default router;