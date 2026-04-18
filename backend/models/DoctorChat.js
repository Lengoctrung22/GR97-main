import mongoose from "mongoose";

const doctorChatSchema = new mongoose.Schema(
  {
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    sender: {
      type: String,
      enum: ["patient", "doctor"],
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Index for efficient queries
doctorChatSchema.index({ appointment: 1, createdAt: -1 });
doctorChatSchema.index({ patient: 1, doctor: 1, createdAt: -1 });

export const DoctorChat = mongoose.model("DoctorChat", doctorChatSchema);
