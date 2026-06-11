import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "XOF" },
    reason: String,
    status: { type: String, enum: ["pending", "paid", "failed", "refunded"], default: "pending" },
    provider: String,
    providerRef: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);

export const Transaction = mongoose.model("Transaction", transactionSchema);