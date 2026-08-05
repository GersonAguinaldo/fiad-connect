import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { User } from "../models/User.js";
import { Profile } from "../models/Profile.js";
import { signToken, requireAuth } from "../middleware/auth.js";
import { sendEmail } from "../emails/mailer.js";
import { templates } from "../emails/templates.js";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: z.string().trim().max(40).optional(),
  phoneCountry: z.string().trim().max(8).optional(),
  sex: z.string().optional(),
  birthDate: z.string().optional(),
  birthPlace: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
});

router.post("/register", async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const exists = await User.findOne({ email: data.email.toLowerCase() });
    if (exists) return res.status(409).json({ error: "Email deja utilise" });
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await User.create({ email: data.email, passwordHash, roles: ["membre"] });
    await Profile.create({
      user: user._id,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      phoneCountry: data.phoneCountry,
      sex: data.sex,
      birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      birthPlace: data.birthPlace,
      country: data.country,
      city: data.city,
      address: data.address,
    });
    const token = signToken(user);
    void sendEmail({
      to: user.email,
      ...templates.welcome({
        firstName: data.firstName,
        email: user.email,
        createdAt: user.createdAt,
      }),
      meta: { userId: user._id },
    });
    res.status(201).json({ token, user: { id: user._id, email: user.email, roles: user.roles } });
  } catch (err) {
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = z
      .object({ email: z.string().email(), password: z.string().min(1) })
      .parse(req.body);
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: "Identifiants invalides" });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Identifiants invalides" });
    const token = signToken(user);
    res.json({ token, user: { id: user._id, email: user.email, roles: user.roles } });
  } catch (err) {
    next(err);
  }
});

router.get("/me", requireAuth, async (req, res) => {
  const profile = await Profile.findOne({ user: req.user._id }).lean();
  res.json({ user: { id: req.user._id, email: req.user.email, roles: req.user.roles }, profile });
});

// Changement de mot de passe (utilisateur connecte)
router.post("/change-password", requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = z
      .object({ currentPassword: z.string().min(1), newPassword: z.string().min(8).max(128) })
      .parse(req.body);
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "Introuvable" });
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Mot de passe actuel invalide" });
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Reset admin : forcer un nouveau mot de passe pour un user (utilise pour les comptes importes)
router.post("/admin/reset-password", requireAuth, async (req, res, next) => {
  try {
    if (!req.user.roles?.includes("admin")) return res.status(403).json({ error: "Forbidden" });
    const { userId, newPassword } = z
      .object({ userId: z.string().min(1), newPassword: z.string().min(8).max(128) })
      .parse(req.body);
    const hash = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(userId, { $set: { passwordHash: hash } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;