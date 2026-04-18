import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      default: null,
    },
    doctorName: {
      type: String,
      default: "",
      trim: true,
    },
    hospital: {
      type: String,
      default: "",
      trim: true,
    },
    slotLabel: {
      type: String,
      default: "",
      trim: true,
    },
    appointmentAt: {
      type: Date,
      required: true,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded"],
      default: "pending",
    },
    amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    bookingCode: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

export const Appointment = mongoose.model("Appointment", appointmentSchema);
