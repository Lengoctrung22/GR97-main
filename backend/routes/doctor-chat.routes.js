import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { DoctorChat } from "../models/DoctorChat.js";
import { Appointment } from "../models/Appointment.js";
import { Doctor } from "../models/Doctor.js";
import { User } from "../models/User.js";
import { authRequired } from "../middlewares/auth.js";
import { validateBody } from "../middlewares/validate.js";
import { getIO } from "../services/socket.service.js";

const router = Router();

const toObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : value;

const requireDoctor = (req, res, next) => {
  if (!req.user || req.user.role !== "doctor" || !req.user.doctorId) {
    return res.status(403).json({ message: "Forbidden: doctor access only" });
  }
  return next();
};

router.use(authRequired);

router.get("/conversations", async (req, res, next) => {
  try {
    const patientObjectId = toObjectId(req.user.userId);

    const conversations = await DoctorChat.aggregate([
      {
        $match: {
          patient: patientObjectId,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: "$doctor",
          doctorId: { $first: "$doctor" },
          lastMessage: { $first: "$message" },
          lastSender: { $first: "$sender" },
          lastMessageAt: { $first: "$createdAt" },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$sender", "doctor"] }, { $eq: ["$isRead", false] }] },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: "doctors",
          localField: "doctorId",
          foreignField: "_id",
          as: "doctorInfo",
        },
      },
      {
        $unwind: "$doctorInfo",
      },
      {
        $project: {
          _id: 0,
          doctorId: 1,
          doctorName: { $ifNull: ["$doctorInfo.fullName", "$doctorInfo.name"] },
          doctorSpecialty: "$doctorInfo.specialty",
          doctorAvatar: { $ifNull: ["$doctorInfo.avatarUrl", "$doctorInfo.avatar"] },
          lastMessage: 1,
          lastSender: 1,
          lastMessageAt: 1,
          unreadCount: 1,
        },
      },
      {
        $sort: { lastMessageAt: -1 },
      },
    ]);

    return res.json({ conversations });
  } catch (error) {
    return next(error);
  }
});

router.get("/history", async (req, res, next) => {
  try {
    const { doctorId, appointmentId, before } = req.query;
    const limit = Number(req.query.limit) || 50;
    const patientId = req.user.userId;

    if (!doctorId) {
      return res.status(400).json({ message: "doctorId is required" });
    }

    const query = {
      patient: patientId,
      doctor: doctorId,
    };

    if (appointmentId) {
      query.appointment = appointmentId;
    }

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await DoctorChat.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("senderId", "fullName avatarUrl avatar")
      .lean();

    const readQuery = {
      patient: patientId,
      doctor: doctorId,
      sender: "doctor",
      isRead: false,
    };

    if (appointmentId) {
      readQuery.appointment = appointmentId;
    }

    await DoctorChat.updateMany(readQuery, {
      isRead: true,
      readAt: new Date(),
    });

    return res.json({ messages: messages.reverse() });
  } catch (error) {
    return next(error);
  }
});

const sendMessageSchema = z.object({
  doctorId: z.string().min(1),
  appointmentId: z.string().optional(),
  message: z.string().trim().min(1).max(2000),
});

router.post("/message", validateBody(sendMessageSchema), async (req, res, next) => {
  try {
    const { doctorId: requestedDoctorId, appointmentId, message } = req.body;
    const patientId = req.user.userId;
    let doctorId = requestedDoctorId;

    if (appointmentId) {
      const appointment = await Appointment.findOne({
        _id: appointmentId,
        user: patientId,
      }).select("doctor");

      if (!appointment || !appointment.doctor) {
        return res.status(404).json({ message: "Appointment not found for this patient" });
      }

      const appointmentDoctorId = appointment.doctor.toString();
      if (requestedDoctorId && String(requestedDoctorId) !== appointmentDoctorId) {
        return res.status(400).json({ message: "Selected appointment does not belong to this doctor" });
      }

      doctorId = appointmentDoctorId;
    }

    const doctor = await Doctor.findById(doctorId).select("_id fullName name specialty avatarUrl avatar");
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    const chatMessage = await DoctorChat.create({
      appointment: appointmentId || null,
      patient: patientId,
      doctor: doctorId,
      sender: "patient",
      senderId: patientId,
      message,
    });

    await chatMessage.populate("senderId", "fullName avatarUrl avatar");

    try {
      const io = getIO();
      io.to(`doctor:${doctorId}`).emit("new-patient-message", {
        message: chatMessage,
        doctorId,
        patientId,
      });
    } catch (socketError) {
      console.log("Socket notification skipped", socketError?.message || "");
    }

    return res.status(201).json({ message: chatMessage });
  } catch (error) {
    return next(error);
  }
});

router.get("/appointments", async (req, res, next) => {
  try {
    const appointments = await Appointment.find({
      user: req.user.userId,
      status: { $in: ["confirmed", "completed"] },
      doctor: { $ne: null },
    })
      .populate("doctor", "fullName name specialty avatarUrl avatar")
      .sort({ appointmentAt: -1 })
      .limit(20)
      .lean();

    return res.json({ appointments });
  } catch (error) {
    return next(error);
  }
});

router.post("/start", async (req, res, next) => {
  try {
    const { appointmentId, doctorId, initialMessage } = req.body || {};
    const patientId = req.user.userId;
    let doctor = null;

    if (appointmentId) {
      const appointment = await Appointment.findOne({
        _id: appointmentId,
        user: patientId,
      }).populate("doctor");

      if (!appointment || !appointment.doctor) {
        return res.status(404).json({ message: "Appointment not found for this patient" });
      }

      if (doctorId && String(appointment.doctor._id) !== String(doctorId)) {
        return res.status(400).json({ message: "Selected appointment does not belong to this doctor" });
      }

      doctor = appointment.doctor;
    } else if (doctorId) {
      doctor = await Doctor.findById(doctorId);
    }

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    if (initialMessage) {
      const chatMessage = await DoctorChat.create({
        appointment: appointmentId || null,
        patient: patientId,
        doctor: doctor._id,
        sender: "patient",
        senderId: patientId,
        message: initialMessage,
      });

      return res.status(201).json({
        message: chatMessage,
        doctor: {
          id: doctor._id,
          name: doctor.fullName || doctor.name,
          specialty: doctor.specialty,
          avatar: doctor.avatarUrl || doctor.avatar,
        },
      });
    }

    return res.json({
      doctor: {
        id: doctor._id,
        name: doctor.fullName || doctor.name,
        specialty: doctor.specialty,
        avatar: doctor.avatarUrl || doctor.avatar,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/read", async (req, res, next) => {
  try {
    const { doctorId, appointmentId } = req.body || {};
    const patientId = req.user.userId;

    if (!doctorId) {
      return res.status(400).json({ message: "doctorId is required" });
    }

    const query = {
      patient: patientId,
      doctor: doctorId,
      sender: "doctor",
      isRead: false,
    };

    if (appointmentId) {
      query.appointment = appointmentId;
    }

    await DoctorChat.updateMany(query, {
      isRead: true,
      readAt: new Date(),
    });

    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

router.get("/doctor/conversations", requireDoctor, async (req, res, next) => {
  try {
    const doctorObjectId = toObjectId(req.user.doctorId);

    const conversations = await DoctorChat.aggregate([
      {
        $match: {
          doctor: doctorObjectId,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: {
            patient: "$patient",
            appointment: "$appointment",
          },
          patientId: { $first: "$patient" },
          appointmentId: { $first: "$appointment" },
          lastMessage: { $first: "$message" },
          lastSender: { $first: "$sender" },
          lastMessageAt: { $first: "$createdAt" },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$sender", "patient"] }, { $eq: ["$isRead", false] }] },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "patientId",
          foreignField: "_id",
          as: "patientInfo",
        },
      },
      {
        $unwind: "$patientInfo",
      },
      {
        $lookup: {
          from: "appointments",
          localField: "appointmentId",
          foreignField: "_id",
          as: "appointmentInfo",
        },
      },
      {
        $unwind: {
          path: "$appointmentInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          patientId: 1,
          patientName: "$patientInfo.fullName",
          patientPhone: "$patientInfo.phone",
          patientEmail: "$patientInfo.email",
          appointmentId: 1,
          appointmentAt: "$appointmentInfo.appointmentAt",
          appointmentStatus: "$appointmentInfo.status",
          appointmentNotes: "$appointmentInfo.notes",
          lastMessage: 1,
          lastSender: 1,
          lastMessageAt: 1,
          unreadCount: 1,
        },
      },
      {
        $sort: { lastMessageAt: -1 },
      },
    ]);

    return res.json({ conversations });
  } catch (error) {
    return next(error);
  }
});

router.get("/doctor/history", requireDoctor, async (req, res, next) => {
  try {
    const { patientId, appointmentId, before } = req.query;
    const limit = Number(req.query.limit) || 50;
    const doctorId = req.user.doctorId;

    if (!patientId) {
      return res.status(400).json({ message: "patientId is required" });
    }

    const query = {
      doctor: doctorId,
      patient: patientId,
    };

    if (appointmentId) {
      query.appointment = appointmentId;
    }

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await DoctorChat.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("patient", "fullName phone email")
      .lean();

    const readQuery = {
      doctor: doctorId,
      patient: patientId,
      sender: "patient",
      isRead: false,
    };

    if (appointmentId) {
      readQuery.appointment = appointmentId;
    }

    await DoctorChat.updateMany(readQuery, {
      isRead: true,
      readAt: new Date(),
    });

    return res.json({ messages: messages.reverse() });
  } catch (error) {
    return next(error);
  }
});

const doctorReplySchema = z.object({
  patientId: z.string().min(1),
  appointmentId: z.string().optional(),
  message: z.string().trim().min(1).max(2000),
});

router.post("/doctor/message", requireDoctor, validateBody(doctorReplySchema), async (req, res, next) => {
  try {
    const { patientId, appointmentId, message } = req.body;
    const doctorId = req.user.doctorId;

    const patient = await User.findById(patientId).select("_id fullName");
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    if (appointmentId) {
      const appointment = await Appointment.findOne({
        _id: appointmentId,
        user: patientId,
        doctor: doctorId,
      }).select("_id");

      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found for this doctor and patient" });
      }
    }

    const chatMessage = await DoctorChat.create({
      appointment: appointmentId || null,
      patient: patientId,
      doctor: doctorId,
      sender: "doctor",
      senderId: doctorId,
      message,
    });

    try {
      const io = getIO();
      io.to(`user:${patientId}`).emit("new-doctor-message", {
        message: chatMessage,
        doctorId,
        patientId,
      });
    } catch (socketError) {
      console.log("Socket notification skipped", socketError?.message || "");
    }

    return res.status(201).json({ message: chatMessage });
  } catch (error) {
    return next(error);
  }
});

router.post("/doctor/read", requireDoctor, async (req, res, next) => {
  try {
    const { patientId, appointmentId } = req.body || {};
    const doctorId = req.user.doctorId;

    if (!patientId) {
      return res.status(400).json({ message: "patientId is required" });
    }

    const query = {
      doctor: doctorId,
      patient: patientId,
      sender: "patient",
      isRead: false,
    };

    if (appointmentId) {
      query.appointment = appointmentId;
    }

    await DoctorChat.updateMany(query, {
      isRead: true,
      readAt: new Date(),
    });

    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

export default router;
