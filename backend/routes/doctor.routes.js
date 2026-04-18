import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { Doctor } from "../models/Doctor.js";
import { Appointment } from "../models/Appointment.js";
import { Service } from "../models/Service.js";
import { User } from "../models/User.js";
import { authRequired } from "../middlewares/auth.js";
import { validateBody } from "../middlewares/validate.js";
import {
  createDoctorBooking,
  getDoctors as getMemoryDoctors,
  listHospitals as listMemoryHospitals,
  markBookingPaid,
} from "../services/memoryClinic.js";
import { findById as findMemoryUserById } from "../services/memoryAuth.js";
import { buildPaymentInfo, getClientIp } from "../services/payment.service.js";
import { sendAppointmentConfirmationEmail } from "../services/email.service.js";

const router = Router();
const useMemoryAuth = process.env.IN_MEMORY_AUTH === "1";

const bookSchema = z.object({
  slotLabel: z.string().min(1).max(20),
  appointmentAt: z.string().datetime(),
  notes: z.string().max(500).optional().default(""),
});

const toSearchRegex = (value) => new RegExp(value.trim(), "i");

router.get("/hospitals", async (req, res, next) => {
  try {
    if (useMemoryAuth) {
      return res.json({ hospitals: listMemoryHospitals() });
    }

    const hospitals = await Doctor.distinct("hospital");
    return res.json({
      hospitals: hospitals.sort((a, b) => a.localeCompare(b, "vi", { sensitivity: "base" })),
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    if (useMemoryAuth) {
      return res.json({ doctors: getMemoryDoctors(req.query || {}) });
    }

    const { q = "", specialty = "", hospital = "", minRating = "" } = req.query;
    const filter = {};

    if (q) {
      filter.$or = [
        { fullName: toSearchRegex(q) },
        { specialty: toSearchRegex(q) },
        { hospital: toSearchRegex(q) },
      ];
    }
    if (specialty) filter.specialty = toSearchRegex(specialty);
    if (hospital) filter.hospital = toSearchRegex(hospital);
    if (minRating) filter.rating = { $gte: Number(minRating) || 0 };

    const doctors = await Doctor.find(filter).sort({ rating: -1, fullName: 1 });
    return res.json({ doctors });
  } catch (error) {
    return next(error);
  }
});

router.post(
  "/:doctorId/book",
  authRequired,
  validateBody(bookSchema),
  async (req, res, next) => {
    try {
      const { doctorId } = req.params;
      const { slotLabel, appointmentAt, notes } = req.body;

      if (useMemoryAuth) {
        const result = createDoctorBooking({
          userId: req.user.userId,
          doctorId,
          slotLabel,
          appointmentAt,
          notes,
        });

        if (result.error) {
          return res.status(result.status || 400).json({ message: result.error });
        }

        const payment = buildPaymentInfo({
          amount: result.appointment.amount,
          bookingCode: result.appointment.bookingCode,
          orderInfo: `Thanh toán lịch khám ${result.appointment.doctorName}`,
          ipAddr: getClientIp(req),
        });

        // Send confirmation email
        const user = findMemoryUserById(req.user.userId);
        if (user && user.email) {
          sendAppointmentConfirmationEmail(
            user.email,
            user.fullName,
            result.appointment.doctorName,
            result.appointment.appointmentAt,
            result.appointment.hospital,
            result.appointment.bookingCode
          ).catch((err) => console.error("Failed to send confirmation email:", err));
        }

        return res.status(201).json({
          appointment: result.appointment,
          payment,
        });
      }

      if (!mongoose.Types.ObjectId.isValid(doctorId)) {
        return res.status(400).json({ message: "Invalid doctorId" });
      }

      const doctor = await Doctor.findById(doctorId);
      if (!doctor) return res.status(404).json({ message: "Doctor not found" });

      const slotAllowed = doctor.timeSlots?.includes(slotLabel);
      if (!slotAllowed) {
        return res.status(400).json({ message: "Selected timeslot is not available" });
      }

      const date = new Date(appointmentAt);
      if (Number.isNaN(date.getTime()) || date <= new Date()) {
        return res.status(400).json({ message: "appointmentAt must be in the future" });
      }

      const service =
        (await Service.findOne({ title: "General Consultation" })) ||
        (await Service.findOne());

      if (!service) {
        return res.status(400).json({ message: "No service available for booking" });
      }

      const bookingCode = `HC-${Date.now().toString().slice(-6)}`;

      const appointment = await Appointment.create({
        user: req.user.userId,
        service: service._id,
        doctor: doctor._id,
        doctorName: doctor.fullName,
        hospital: doctor.hospital,
        slotLabel,
        appointmentAt: date,
        notes,
        amount: service.price,
        bookingCode,
        paymentStatus: "pending",
        status: "pending",
      });

      const populated = await appointment.populate(["doctor", "service"]);
      
      // Get user email for confirmation
      const user = await User.findById(req.user.userId).select("email fullName");
      if (user && user.email) {
        sendAppointmentConfirmationEmail(
          user.email,
          user.fullName,
          doctor.fullName,
          appointment.appointmentAt,
          doctor.hospital,
          bookingCode
        ).catch((err) => console.error("Failed to send confirmation email:", err));
      }

      const payment = buildPaymentInfo({
        amount: appointment.amount,
        bookingCode,
        orderInfo: `Thanh toán lịch khám ${doctor.fullName}`,
        ipAddr: getClientIp(req),
      });

      return res.status(201).json({
        appointment: populated,
        payment,
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.patch("/bookings/:id/pay", authRequired, async (req, res, next) => {
  try {
    if (useMemoryAuth) {
      const result = markBookingPaid({
        userId: req.user.userId,
        bookingId: req.params.id,
      });

      if (result.error) {
        return res.status(result.status || 400).json({ message: result.error });
      }

      return res.json(result);
    }

    const appointment = await Appointment.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    appointment.paymentStatus = "paid";
    appointment.status = "confirmed";
    await appointment.save();

    const populated = await appointment.populate(["doctor", "service"]);
    return res.json({ appointment: populated });
  } catch (error) {
    return next(error);
  }
});

export default router;
