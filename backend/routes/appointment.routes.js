import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { Appointment } from "../models/Appointment.js";
import { Service } from "../models/Service.js";
import { User } from "../models/User.js";
import { authRequired } from "../middlewares/auth.js";
import { validateBody } from "../middlewares/validate.js";
import { cancelBooking, listAppointmentsByUser } from "../services/memoryClinic.js";
import { findById as findMemoryUserById } from "../services/memoryAuth.js";
import { sendAppointmentConfirmationEmail } from "../services/email.service.js";

const router = Router();
const useMemoryAuth = process.env.IN_MEMORY_AUTH === "1";

const appointmentSchema = z.object({
  serviceId: z.string().min(1),
  appointmentAt: z.string().datetime(),
  notes: z.string().max(500).optional().default(""),
});

router.use(authRequired);

router.post("/", validateBody(appointmentSchema), async (req, res, next) => {
  try {
    if (useMemoryAuth) {
      return res.status(400).json({
        message: "In-memory mode uses /api/doctors/:doctorId/book for booking",
      });
    }

    const { serviceId, appointmentAt, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({ message: "Invalid serviceId" });
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    const date = new Date(appointmentAt);
    if (Number.isNaN(date.getTime()) || date <= new Date()) {
      return res
        .status(400)
        .json({ message: "appointmentAt must be a future datetime" });
    }

    const appointment = await Appointment.create({
      user: req.user.userId,
      service: service._id,
      appointmentAt: date,
      notes,
    });

    const populated = await appointment.populate("service");
    
    // Get user info for email
    const user = await User.findById(req.user.userId).select("email fullName");
    if (user && user.email) {
      sendAppointmentConfirmationEmail(
        user.email,
        user.fullName,
        "", // No doctor assigned yet
        appointment.appointmentAt,
        "", // No hospital info
        ""
      ).catch((err) => console.error("Failed to send confirmation email:", err));
    }
    
    return res.status(201).json({ appointment: populated });
  } catch (error) {
    return next(error);
  }
});

router.get("/me", async (req, res, next) => {
  try {
    if (useMemoryAuth) {
      return res.json({ appointments: listAppointmentsByUser(req.user.userId) });
    }

    const appointments = await Appointment.find({ user: req.user.userId })
      .populate("service")
      .populate("doctor")
      .sort({ appointmentAt: -1 });
    return res.json({ appointments });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:id/cancel", async (req, res, next) => {
  try {
    if (useMemoryAuth) {
      const result = cancelBooking({
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

    if (appointment.status === "completed") {
      return res
        .status(400)
        .json({ message: "Completed appointment cannot be cancelled" });
    }

    appointment.status = "cancelled";
    await appointment.save();

    const populated = await appointment.populate(["service", "doctor"]);
    return res.json({ appointment: populated });
  } catch (error) {
    return next(error);
  }
});

export default router;
