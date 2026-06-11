import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    type: String,
    startsAt: Date,
    endsAt: Date,
    location: String,
    price: { type: Number, default: 0 },
    currency: { type: String, default: "XOF" },
    targetCategories: [String],
    targetCities: [String],
    targetCountries: [String],
    coverUrl: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

const registrationSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, default: "inscrit" },
  },
  { timestamps: true },
);
registrationSchema.index({ event: 1, user: 1 }, { unique: true });

export const Event = mongoose.model("Event", eventSchema);
export const EventRegistration = mongoose.model("EventRegistration", registrationSchema);