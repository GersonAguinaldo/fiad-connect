import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "singleton", unique: true },
    ambassadorFeeAmount: { type: Number, default: 25000 },
    ambassadorFeeCurrency: { type: String, default: "XOF" },
    duesPeriodMonths: { type: Number, default: 12 },
    gracePeriodDays: { type: Number, default: 30 },
    reminderDaysBefore: { type: Number, default: 15 },
    autoStatusEnabled: { type: Boolean, default: true },
    lastStatusRunAt: Date,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export const AppSettings = mongoose.model("AppSettings", settingsSchema);