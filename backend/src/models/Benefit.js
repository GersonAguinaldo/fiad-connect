import mongoose from "mongoose";

const benefitSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    category: { type: String, default: "Général" },
    accessConditions: String,
    linkUrl: String,
    status: { type: String, default: "Actif" },
    position: { type: Number, default: 0 },
    targetCategories: { type: [String], default: [] },
    targetMembershipTypes: { type: [String], default: [] },
    targetStatuses: { type: [String], default: [] },
    targetCities: { type: [String], default: [] },
    targetCountries: { type: [String], default: [] },
  },
  { timestamps: true },
);

export const Benefit = mongoose.model("Benefit", benefitSchema);
