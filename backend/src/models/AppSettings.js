import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "singleton", unique: true },
    ambassadorFeeAmount: { type: Number, default: 25000 },
    ambassadorFeeCurrency: { type: String, default: "XOF" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export const AppSettings = mongoose.model("AppSettings", settingsSchema);