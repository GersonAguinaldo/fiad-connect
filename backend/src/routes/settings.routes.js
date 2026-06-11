import { Router } from "express";
import { AppSettings } from "../models/AppSettings.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/", async (_req, res) => {
  const settings = await AppSettings.findOneAndUpdate(
    { key: "singleton" },
    { $setOnInsert: { key: "singleton" } },
    { new: true, upsert: true },
  ).lean();
  res.json(settings);
});

router.patch("/", requireAuth, requireRole("admin"), async (req, res) => {
  const settings = await AppSettings.findOneAndUpdate(
    { key: "singleton" },
    { $set: { ...req.body, updatedBy: req.user._id } },
    { new: true, upsert: true },
  ).lean();
  res.json(settings);
});

export default router;