import mongoose from "mongoose";

// Certificat delivre a l'issue d'une formation.
// Le PDF est genere a la volee et stocke dans /uploads/certificates/.
const certificateSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    formation: { type: mongoose.Schema.Types.ObjectId, ref: "Formation", required: true },
    code: { type: String, required: true, unique: true }, // numero de certificat verifiable
    fileUrl: String, // /uploads/certificates/xxx.pdf
    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);
certificateSchema.index({ user: 1, formation: 1 }, { unique: true });

export const Certificate = mongoose.model("Certificate", certificateSchema);