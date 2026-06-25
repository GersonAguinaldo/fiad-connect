import mongoose from "mongoose";

const eventResourceSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    title: { type: String, required: true },
    description: String,
    fileUrl: String,
    fileName: String,
    fileType: String,
    fileSize: Number,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export const EventResource = mongoose.model("EventResource", eventResourceSchema);