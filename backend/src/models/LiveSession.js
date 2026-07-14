import mongoose from "mongoose";

// Cours hebdomadaire en direct anime par le President Mondial (ou un formateur).
// Les membres s'inscrivent, recoivent un rappel, et peuvent recuperer l'enregistrement
// + les notes apres coup (acces differe).
const liveSessionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    host: String, // nom de l'animateur, ex: "President Mondial"
    startsAt: { type: Date, required: true },
    endsAt: Date,
    meetingUrl: String, // lien visio (Zoom, Meet, ...)
    recordingUrl: String, // rempli apres le direct
    notesUrl: String, // notes / support telechargeable
    status: {
      type: String,
      enum: ["planifie", "en_cours", "termine", "annule"],
      default: "planifie",
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

const liveSessionAttendeeSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: "LiveSession", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    joinedAt: Date, // presence effective en direct
    reminderSentAt: Date,
  },
  { timestamps: true },
);
liveSessionAttendeeSchema.index({ session: 1, user: 1 }, { unique: true });

export const LiveSession = mongoose.model("LiveSession", liveSessionSchema);
export const LiveSessionAttendee = mongoose.model("LiveSessionAttendee", liveSessionAttendeeSchema);