import mongoose from "mongoose";

const presidencyHistorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date, default: null },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    note: String,
  },
  { timestamps: true },
);
// Un seul President Mondial actif a la fois (contrainte base de donnees).
presidencyHistorySchema.index(
  { endedAt: 1 },
  { unique: true, partialFilterExpression: { endedAt: null } },
);

const presidencyTeamSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export const PresidencyHistory = mongoose.model("PresidencyHistory", presidencyHistorySchema);
export const PresidencyTeam = mongoose.model("PresidencyTeam", presidencyTeamSchema);