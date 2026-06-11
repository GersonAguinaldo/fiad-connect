import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

export function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email, roles: user.roles },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? "7d" },
  );
}

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization ?? "";
    if (!header.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).lean();
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user?.roles?.some((r) => roles.includes(r))) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}