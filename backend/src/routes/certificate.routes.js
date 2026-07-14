import { Router } from "express";
import { Certificate } from "../models/Certificate.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// Mes certificats.
router.get("/me", requireAuth, async (req, res) => {
  const list = await Certificate.find({ user: req.user._id })
    .populate("formation", "title")
    .sort({ issuedAt: -1 })
    .lean();
  res.json(list);
});

// Verification publique (par code) — permet de valider un certificat sans etre connecte.
router.get("/verify/:code", async (req, res) => {
  const cert = await Certificate.findOne({ code: req.params.code })
    .populate("formation", "title")
    .populate("user", "email")
    .lean();
  if (!cert) return res.status(404).json({ valid: false });
  res.json({ valid: true, certificate: cert });
});

// Vue admin: tous les certificats.
router.get("/", requireAuth, requireRole("admin"), async (_req, res) => {
  const list = await Certificate.find()
    .populate("formation", "title")
    .populate("user", "email")
    .sort({ issuedAt: -1 })
    .lean();
  res.json(list);
});

export default router;