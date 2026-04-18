import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    size: { type: String, required: true, trim: true },
    uploadedAtLabel: { type: String, default: "" },
  },
  { _id: false }
);

const prescriptionSchema = new mongoose.Schema(
  {
    medicine: { type: String, required: true, trim: true },
    dosage: { type: String, required: true, trim: true },
    usage: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const medicalRecordSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    visitDate: { type: Date, required: true },
    hospital: { type: String, required: true, trim: true },
    doctorName: { type: String, required: true, trim: true },
    specialty: { type: String, required: true, trim: true },
    diagnosis: { type: String, required: true, trim: true },
    summary: { type: String, default: "", trim: true },
    symptoms: [{ type: String }],
    recommendations: [{ type: String }],
    files: [fileSchema],
    prescriptions: [prescriptionSchema],
  },
  { timestamps: true }
);

export const MedicalRecord = mongoose.model("MedicalRecord", medicalRecordSchema);
