import mongoose from "mongoose";

// Un module (chapitre) d'une formation. Une formation devient completee
// quand tous ses modules sont marques comme termines.
const formationModuleSchema = new mongoose.Schema(
  {
    formation: { type: mongoose.Schema.Types.ObjectId, ref: "Formation", required: true },
    title: { type: String, required: true },
    description: String,
    order: { type: Number, default: 0 },
    resourceUrl: String, // video / PDF du module
    durationMinutes: Number,
  },
  { timestamps: true },
);
formationModuleSchema.index({ formation: 1, order: 1 });

// Progression d'un membre sur un module donne.
const formationProgressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    formation: { type: mongoose.Schema.Types.ObjectId, ref: "Formation", required: true },
    module: { type: mongoose.Schema.Types.ObjectId, ref: "FormationModule", required: true },
    completed: { type: Boolean, default: false },
    completedAt: Date,
    score: Number, // optionnel: si quiz
  },
  { timestamps: true },
);
formationProgressSchema.index({ user: 1, module: 1 }, { unique: true });

export const FormationModule = mongoose.model("FormationModule", formationModuleSchema);
export const FormationProgress = mongoose.model("FormationProgress", formationProgressSchema);