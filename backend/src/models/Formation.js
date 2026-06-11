import mongoose from "mongoose";

const formationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    trainer: String,
    startsAt: Date,
    endsAt: Date,
    resourceUrl: String,
    price: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const enrollmentSchema = new mongoose.Schema(
  {
    formation: { type: mongoose.Schema.Types.ObjectId, ref: "Formation", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, default: "inscrit" },
  },
  { timestamps: true },
);
enrollmentSchema.index({ formation: 1, user: 1 }, { unique: true });

export const Formation = mongoose.model("Formation", formationSchema);
export const FormationEnrollment = mongoose.model("FormationEnrollment", enrollmentSchema);