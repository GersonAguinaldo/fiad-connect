import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { User } from "../models/User.js";
import { Profile } from "../models/Profile.js";
import { signToken, requireAuth } from "../middleware/auth.js";

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

export default router;