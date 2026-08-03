import mongoose from "mongoose";

const historySchema = new mongoose.Schema(
  {
    profile: { type: mongoose.Schema.Types.ObjectId, ref: "Profile", required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    oldStatus: String,
    newStatus: { type: String, required: true },
    reason: String,
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    automatic: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const MemberStatusHistory = mongoose.model("MemberStatusHistory", historySchema);