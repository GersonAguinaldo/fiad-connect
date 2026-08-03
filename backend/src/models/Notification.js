import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    kind: { type: String, default: "info" },
    title: { type: String, required: true },
    body: String,
    link: String,
    readAt: Date,
  },
  { timestamps: true },
);

export const Notification = mongoose.model("Notification", notificationSchema);