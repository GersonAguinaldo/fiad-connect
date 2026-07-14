import { Router } from "express";
import { Formation, FormationEnrollment } from "../models/Formation.js";
import { FormationModule, FormationProgress } from "../models/FormationModule.js";
import { Certificate } from "../models/Certificate.js";
import { Profile } from "../models/Profile.js";
import { generateCertificatePdf } from "../utils/generate-certificate.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import path from "node:path";

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

// --- Modules d'une formation ---
router.get("/:id/modules", async (req, res) => {
  const mods = await FormationModule.find({ formation: req.params.id }).sort({ order: 1 }).lean();
  res.json(mods);
});

router.post("/:id/modules", requireAuth, requireRole("admin"), async (req, res) => {
  const mod = await FormationModule.create({ ...req.body, formation: req.params.id });
  res.status(201).json(mod);
});

router.patch("/:id/modules/:moduleId", requireAuth, requireRole("admin"), async (req, res) => {
  const mod = await FormationModule.findByIdAndUpdate(req.params.moduleId, { $set: req.body }, { new: true });
  res.json(mod);
});

router.delete("/:id/modules/:moduleId", requireAuth, requireRole("admin"), async (req, res) => {
  await FormationModule.findByIdAndDelete(req.params.moduleId);
  await FormationProgress.deleteMany({ module: req.params.moduleId });
  res.json({ ok: true });
});

// --- Progression du membre courant ---
router.get("/:id/progress", requireAuth, async (req, res) => {
  const list = await FormationProgress.find({ formation: req.params.id, user: req.user._id }).lean();
  res.json(list);
});

// Marque un module comme complete pour l'utilisateur courant.
// Si tous les modules de la formation sont completes, genere le certificat.
router.post("/:id/modules/:moduleId/complete", requireAuth, async (req, res) => {
  const formationId = req.params.id;
  const moduleId = req.params.moduleId;

  await FormationProgress.findOneAndUpdate(
    { user: req.user._id, module: moduleId },
    {
      $set: { completed: true, completedAt: new Date() },
      $setOnInsert: { user: req.user._id, formation: formationId, module: moduleId },
    },
    { upsert: true, new: true },
  );

  const modules = await FormationModule.find({ formation: formationId }).select("_id").lean();
  const done = await FormationProgress.countDocuments({
    user: req.user._id,
    formation: formationId,
    module: { $in: modules.map((m) => m._id) },
    completed: true,
  });

  let certificate = null;
  if (modules.length > 0 && done >= modules.length) {
    const existing = await Certificate.findOne({ user: req.user._id, formation: formationId }).lean();
    if (existing) {
      certificate = existing;
    } else {
      const formation = await Formation.findById(formationId).lean();
      const profile = await Profile.findOne({ user: req.user._id }).lean();
      const uploadDir = path.resolve(process.env.UPLOAD_DIR ?? "./uploads");
      const { code, fileUrl } = await generateCertificatePdf({
        user: req.user,
        profile,
        formation,
        uploadDir,
      });
      certificate = await Certificate.create({
        user: req.user._id,
        formation: formationId,
        code,
        fileUrl,
      });
      await FormationEnrollment.findOneAndUpdate(
        { formation: formationId, user: req.user._id },
        { $set: { status: "termine" } },
      );
    }
  }

  res.json({ completed: done, total: modules.length, certificate });
});

router.post("/import", requireAuth, requireRole("admin"), async (req, res) => {
  const rows = Array.isArray(req.body) ? req.body : [];
  const created = await Formation.insertMany(rows, { ordered: false }).catch((e) => e.insertedDocs ?? []);
  res.json({ count: created.length });
});

export default router;