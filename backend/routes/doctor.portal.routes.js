/**
 * Doctor Portal Routes
 * Supports both IN_MEMORY_AUTH=1 and MongoDB mode
 *
 * POST   /api/doctor-portal/login               — authenticate with Doctor.account credentials
 * GET    /api/doctor-portal/me                  — current doctor profile
 * GET    /api/doctor-portal/appointments         — appointments assigned to this doctor
 * PATCH  /api/doctor-portal/appointments/:id/status — confirm / complete / cancel
 */
import { Router } from "express";
import bcrypt from "bcryptjs";
import { Doctor } from "../models/Doctor.js";
import { Appointment } from "../models/Appointment.js";
import { signToken } from "../utils/jwt.js";
import { authRequired } from "../middlewares/auth.js";
import {
  findDoctorByCredential,
  findDoctorById as findMemoryDoctorById,
  listDoctorAppointments,
  doctorUpdateAppointmentStatus,
} from "../services/memoryClinic.js";

const router = Router();
const useMemoryAuth = process.env.IN_MEMORY_AUTH === "1";

/* ---------- helper ---------- */
const requireDoctor = (req, res, next) => {
  if (!req.user || req.user.role !== "doctor") {
    return res.status(403).json({ message: "Forbidden: doctor access only" });
  }
  return next();
};

/* ================================================================
   POST /login
   ================================================================ */
router.post("/login", async (req, res, next) => {
  try {
    const { identifier, password } = req.body || {};
    if (!identifier || !password) {
      return res.status(400).json({ message: "identifier và password là bắt buộc." });
    }

    let doctor;

    if (useMemoryAuth) {
      doctor = findDoctorByCredential(identifier);
    } else {
      const id = identifier.trim().toLowerCase();
      const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      doctor = await Doctor.findOne({
        $or: [
          { "account.email": id },
          { "account.username": { $regex: new RegExp(`^${escaped}$`, "i") } },
          { "account.phone": id },
        ],
      });
    }

    if (!doctor) {
      return res.status(401).json({ message: "Thông tin đăng nhập không đúng." });
    }

    if (doctor.account?.isActive === false) {
      return res.status(403).json({ message: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ admin." });
    }

    // Verify password (plaintext tempPassword or bcrypt)
    const stored = doctor.account?.tempPassword || "";
    let valid = false;

    if (!stored) {
      return res.status(401).json({ message: "Tài khoản chưa được cấp mật khẩu. Liên hệ admin." });
    }

    if (stored.startsWith("$2")) {
      valid = await bcrypt.compare(password, stored);
    } else {
      valid = password === stored;
    }

    if (!valid) {
      return res.status(401).json({ message: "Thông tin đăng nhập không đúng." });
    }

    const doctorId = doctor._id?.toString() || doctor._id;
    const token = signToken({ userId: doctorId, role: "doctor", doctorId });

    return res.json({
      token,
      doctor: {
        _id: doctor._id,
        fullName: doctor.fullName,
        title: doctor.title,
        specialty: doctor.specialty,
        hospital: doctor.hospital,
        avatarUrl: doctor.avatarUrl,
        avatarColor: doctor.avatarColor,
      },
    });
  } catch (err) {
    return next(err);
  }
});

/* ================================================================
   Protected routes
   ================================================================ */
router.use(authRequired, requireDoctor);

/* GET /me */
router.get("/me", async (req, res, next) => {
  try {
    let doctor;
    if (useMemoryAuth) {
      doctor = findMemoryDoctorById(req.user.doctorId);
    } else {
      doctor = await Doctor.findById(req.user.doctorId).select("-account.tempPassword");
    }
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });
    return res.json({ doctor });
  } catch (err) {
    return next(err);
  }
});

/* GET /appointments */
router.get("/appointments", async (req, res, next) => {
  try {
    const { status } = req.query;
    const doctorId = req.user.doctorId;

    if (useMemoryAuth) {
      const appts = listDoctorAppointments({ doctorId, status: status || "" });
      return res.json({ appointments: appts, total: appts.length });
    }

    const query = { doctor: doctorId };
    if (status) query.status = status;

    const appointments = await Appointment.find(query)
      .populate("user", "fullName phone email")
      .populate("service", "name")
      .sort({ appointmentAt: -1 });

    return res.json({ appointments, total: appointments.length });
  } catch (err) {
    return next(err);
  }
});

/* PATCH /appointments/:id/status */
router.patch("/appointments/:id/status", async (req, res, next) => {
  try {
    const { status } = req.body || {};
    if (!["confirmed", "completed", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "status phải là confirmed, completed, hoặc cancelled." });
    }

    const doctorId = req.user.doctorId;

    if (useMemoryAuth) {
      const result = doctorUpdateAppointmentStatus({
        appointmentId: req.params.id,
        doctorId,
        status,
      });
      if (result.error) {
        return res.status(result.status || 400).json({ message: result.error });
      }
      return res.json({ appointment: result.appointment });
    }

    const appointment = await Appointment.findOne({ _id: req.params.id, doctor: doctorId });
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }
    if (appointment.status === "completed" || appointment.status === "cancelled") {
      return res.status(400).json({ message: "Không thể cập nhật lịch hẹn đã hoàn thành hoặc đã hủy." });
    }

    appointment.status = status;
    await appointment.save();
    const populated = await appointment.populate("user", "fullName phone email");
    return res.json({ appointment: populated });
  } catch (err) {
    return next(err);
  }
});

export default router;
