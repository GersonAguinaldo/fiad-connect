import nodemailer from "nodemailer";
import { EmailLog } from "../models/EmailLog.js";

let transporter = null;
let verified = null;

/** true quand un SMTP est configure dans .env */
export function emailEnabled() {
  return Boolean(process.env.SMTP_HOST && process.env.EMAIL_FROM);
}

function getTransporter() {
  if (transporter) return transporter;
  if (!emailEnabled()) return null;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: String(process.env.SMTP_SECURE ?? "false") === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  return transporter;
}

/** Verifie la connexion SMTP (utilise par /api/emails/status). */
export async function verifySmtp() {
  const t = getTransporter();
  if (!t) return { configured: false, ok: false, error: "SMTP non configure" };
  try {
    await t.verify();
    verified = true;
    return { configured: true, ok: true };
  } catch (err) {
    verified = false;
    return { configured: true, ok: false, error: err.message };
  }
}

/**
 * Envoie un email et journalise le resultat. N'echoue jamais bruyamment :
 * un email en erreur ne doit pas casser le parcours utilisateur.
 */
export async function sendEmail({ to, subject, html, text, kind = "generic", meta }) {
  if (!to) return { ok: false, skipped: true };
  const t = getTransporter();
  if (!t) {
    await EmailLog.create({ to, subject, kind, status: "skipped", error: "SMTP non configure", meta }).catch(() => {});
    console.warn(`[email] ignore (SMTP non configure): ${subject} -> ${to}`);
    return { ok: false, skipped: true };
  }
  try {
    const info = await t.sendMail({
      from: process.env.EMAIL_FROM,
      replyTo: process.env.EMAIL_REPLY_TO || undefined,
      to,
      subject,
      html,
      text: text ?? html?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    });
    await EmailLog.create({ to, subject, kind, status: "sent", messageId: info.messageId, meta }).catch(() => {});
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    await EmailLog.create({ to, subject, kind, status: "failed", error: err.message, meta }).catch(() => {});
    console.error(`[email] echec ${kind} -> ${to}:`, err.message);
    return { ok: false, error: err.message };
  }
}

export const smtpVerified = () => verified;
