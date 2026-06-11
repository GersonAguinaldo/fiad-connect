import { Router } from "express";
import { Formation, FormationEnrollment } from "../models/Formation.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/", async (_req, res) => {
  res.json(await Formation.find().sort({ startsAt: -1 }).lean());
});

router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  res.status(201).json(await Formation.create(req.body));
});

router.patch("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  res.json(await Formation.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true }));
});

router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  await Formation.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

router.post("/:id/enroll", requireAuth, async (req, res) => {
  const enr = await FormationEnrollment.findOneAndUpdate(
    { formation: req.params.id, user: req.user._id },
    { $setOnInsert: { formation: req.params.id, user: req.user._id } },
    { upsert: true, new: true },
  );
  res.json(enr);
});

router.post("/import", requireAuth, requireRole("admin"), async (req, res) => {
  const rows = Array.isArray(req.body) ? req.body : [];
  const created = await Formation.insertMany(rows, { ordered: false }).catch((e) => e.insertedDocs ?? []);
  res.json({ count: created.length });
});

export default router;