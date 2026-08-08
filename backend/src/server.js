import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectDB } from "./config/db.js";

import authRoutes from "./routes/auth.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import eventRoutes from "./routes/event.routes.js";
import formationRoutes from "./routes/formation.routes.js";
import transactionRoutes from "./routes/transaction.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import eventResourceRoutes from "./routes/event-resource.routes.js";
import liveSessionRoutes from "./routes/live-session.routes.js";
import certificateRoutes from "./routes/certificate.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import emailRoutes from "./routes/email.routes.js";
import benefitRoutes from "./routes/benefit.routes.js";
import messagingRoutes from "./routes/messaging.routes.js";
import presidencyRoutes from "./routes/presidency.routes.js";
import { scheduleMembershipStatusRules } from "./utils/membership-status.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") ?? "*", credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));
app.use("/api", rateLimit({ windowMs: 60_000, max: 200 }));

const uploadDir = path.resolve(process.env.UPLOAD_DIR ?? "./uploads");
app.use("/uploads", express.static(uploadDir));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/formations", formationRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/event-resources", eventResourceRoutes);
app.use("/api/live-sessions", liveSessionRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/emails", emailRoutes);
app.use("/api/benefits", benefitRoutes);
app.use("/api/messaging", messagingRoutes);
app.use("/api/presidency", presidencyRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status ?? 500).json({ error: err.message ?? "Server error" });
});

const PORT = process.env.PORT ?? 4000;
connectDB().then(() => {
  scheduleMembershipStatusRules();
  app.listen(PORT, () => console.log(`API ready on http://localhost:${PORT}`));
});