import { Router } from "express";
import { Benefit } from "../models/Benefit.js";
import { BenefitUsage } from "../models/BenefitUsage.js";
import { Profile } from "../models/Profile.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

const matches = (list, value) =>
  !list || list.length === 0
    ? true
    : !!value && list.some((v) => String(v).toLowerCase() === String(value).toLowerCase());

/** Liste des avantages : filtrée sur le profil pour un membre, complète pour un admin. */
router.get("/", requireAuth, async (req, res) => {
  const all = await Benefit.find().sort({ position: 1, createdAt: -1 }).lean();
  if (req.user.roles?.includes("admin")) return res.json(all);

  const profile = await Profile.findOne({ user: req.user._id }).lean();
  res.json(
    all.filter(
      (b) =>
        b.status === "Actif" &&
        matches(b.targetCategories, profile?.category) &&
        matches(b.targetMembershipTypes, profile?.membershipType) &&
        matches(b.targetStatuses, profile?.status) &&
        matches(b.targetCities, profile?.city) &&
        matches(b.targetCountries, profile?.country),
    ),
  );
});

router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  res.status(201).json(await Benefit.create(req.body));
});

router.put("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const updated = await Benefit.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!updated) return res.status(404).json({ error: "Avantage introuvable" });
  res.json(updated);
});

router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  await Benefit.findByIdAndDelete(req.params.id);
  await BenefitUsage.deleteMany({ benefit: req.params.id });
  res.json({ ok: true });
});

/** Historique d'utilisation : le membre voit le sien, l'admin voit tout. */
router.get("/usage", requireAuth, async (req, res) => {
  const filter = req.user.roles?.includes("admin") ? {} : { user: req.user._id };
  res.json(await BenefitUsage.find(filter).sort({ usedAt: -1 }).limit(500).lean());
});

router.post("/:id/usage", requireAuth, async (req, res) => {
  const benefit = await Benefit.findById(req.params.id).lean();
  if (!benefit) return res.status(404).json({ error: "Avantage introuvable" });
  const { rating, feedback, note } = req.body ?? {};
  res.status(201).json(
    await BenefitUsage.create({ benefit: benefit._id, user: req.user._id, rating, feedback, note }),
  );
});

export default router;
