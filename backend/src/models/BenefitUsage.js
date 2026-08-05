import mongoose from "mongoose";

const benefitUsageSchema = new mongoose.Schema(
  {
    benefit: { type: mongoose.Schema.Types.ObjectId, ref: "Benefit", required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    note: String,
    rating: { type: Number, min: 1, max: 5 },
    feedback: String,
    usedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export const BenefitUsage = mongoose.model("BenefitUsage", benefitUsageSchema);
