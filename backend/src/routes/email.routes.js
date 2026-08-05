import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { emailEnabled, sendEmail, verifySmtp } from "../emails/mailer.js";
import { templates } from "../emails/templates.js";
import { EmailLog } from "../models/EmailLog.js";

const router = Router();

router.get("/status", requireAuth, requireRole("admin"), async (_req, res) => {
  const check = await verifySmtp();
  res.json({
    enabled: emailEnabled(),
    from: process.env.EMAIL_FROM ?? null,
    host: process.env.SMTP_HOST ?? null,
    ...check,
  });
});

router.get("/logs", requireAuth, requireRole("admin"), async (_req, res) => {
  res.json(await EmailLog.find().sort({ createdAt: -1 }).limit(100).lean());
});

router.post("/test", requireAuth, requireRole("admin"), async (req, res) => {
  const to = req.body?.to || req.user.email;
  const tpl = templates.test();
  res.json(await sendEmail({ to, ...tpl }));
});

export default router;
