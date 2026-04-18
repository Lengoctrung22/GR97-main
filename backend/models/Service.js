import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    durationMinutes: { type: Number, required: true, min: 15 },
    price: { type: Number, required: true, min: 0 },
    icon: { type: String, default: "HeartPulse" },
  },
  { timestamps: true }
);

export const Service = mongoose.model("Service", serviceSchema);
