import mongoose from "mongoose";

const emailLogSchema = new mongoose.Schema(
  {
    to: { type: String, required: true, index: true },
    subject: String,
    kind: { type: String, default: "generic", index: true },
    status: { type: String, enum: ["sent", "failed", "skipped"], default: "sent" },
    messageId: String,
    error: String,
    meta: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);

export const EmailLog = mongoose.model("EmailLog", emailLogSchema);
