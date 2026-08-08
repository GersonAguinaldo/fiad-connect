import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: ["president", "direct", "group", "forum", "proximity"],
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    description: String,
    subject: String,
    urgency: { type: String, enum: ["faible", "normale", "urgente"], default: "normale" },
    status: { type: String, enum: ["en_attente", "repondu", "clos"], default: "en_attente" },
    city: String,
    country: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lastMessageAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

const participantSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, default: "membre" },
    subscribed: { type: Boolean, default: true },
    lastReadAt: Date,
  },
  { timestamps: true },
);
participantSchema.index({ conversation: 1, user: 1 }, { unique: true });

const messageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true },
    attachmentUrl: String,
    attachmentName: String,
    attachmentType: String,
    onBehalfOfPresidency: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Conversation = mongoose.model("Conversation", conversationSchema);
export const ConversationParticipant = mongoose.model("ConversationParticipant", participantSchema);
export const Message = mongoose.model("Message", messageSchema);