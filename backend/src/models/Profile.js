import mongoose from "mongoose";

const profileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    firstName: String,
    lastName: String,
    phone: String,
    phoneCountry: String,
    sex: String,
    birthDate: Date,
    birthPlace: String,
    country: String,
    city: String,
    address: String,
    category: { type: String, default: "membre" },
    membershipType: { type: String, default: "standard" },
    status: { type: String, default: "actif" },
    avatarUrl: String,
  },
  { timestamps: true },
);

export const Profile = mongoose.model("Profile", profileSchema);