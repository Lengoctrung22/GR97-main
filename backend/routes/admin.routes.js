import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { authRequired } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/role.js";
import { Appointment } from "../models/Appointment.js";
import { Doctor } from "../models/Doctor.js";
import { User } from "../models/User.js";
import {
  adminCreateDoctor as createMemoryDoctor,
  adminDeleteDoctor as deleteMemoryDoctor,
  adminDeleteDoctorAccount as deleteMemoryDoctorAccount,
  adminGetDoctorById as getMemoryDoctorById,
  adminGetDoctorStats as getMemoryDoctorStats,
  adminListAppointments as listMemoryAppointments,
  adminListDoctors as listMemoryDoctors,
  adminUpdateAppointmentStatus as updateMemoryAppointmentStatus,
  adminUpdateDoctorAccount as updateMemoryDoctorAccount,
} from "../services/memoryClinic.js";
import { generateAIInsights, generateDoctorPerformanceInsights } from "../services/aiAnalytics.service.js";

const router = Router();
const useMemoryAuth = process.env.IN_MEMORY_AUTH === "1";

const APPOINTMENT_STATUSES = ["pending", "confirmed", "completed", "cancelled"];

const doctorCreateSchema = z.object({
  fullName: z.string().min(2).max(120),
  title: z.string().min(2).max(40),
  specialty: z.string().min(2).max(80),
  hospital: z.string().min(2).max(120),
  experienceYears: z.coerce.number().min(0).max(80).default(5),
  rating: z.coerce.number().min(0).max(5).default(4.7),
  bio: z.string().max(500).optional().default(""),
  avatarColor: z.string().min(4).max(20).optional().default("#2b7edb"),
  avatarUrl: z.string().url().optional().default(""),
  timeSlots: z.array(z.string().min(4).max(20)).min(1).default(["08:00", "09:30", "14:00"]),
  account: z
    .object({
      username: z.string().min(3).max(40).optional().default(""),
      email: z.union([z.string().email(), z.literal("")]).optional().default(""),
      phone: z.string().max(20).optional().default(""),
      isActive: z.boolean().optional().default(true),
      tempPassword: z.string().max(40).optional().default(""),
    })
    .optional()
    .default({}),
});

const statusUpdateSchema = z.object({
  status: z.enum(APPOINTMENT_STATUSES),
});

const doctorAccountSchema = z.object({
  username: z.string().min(3).max(40).optional(),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  phone: z.string().max(20).optional(),
  tempPassword: z.string().max(40).optional(),
  isActive: z.boolean().optional(),
});

const formatDay = (dateInput) => {
  const date = new Date(dateInput);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
};

const buildChartSeries = (appointments, days = 7) => {
  const map = new Map();
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - i);
    const key = formatDay(date);
    map.set(key, {
      key,
      label: `T${date.getDay() === 0 ? 8 : date.getDay() + 1}`,
      count: 0,
      revenue: 0,
    });
  }

  appointments.forEach((item) => {
    const key = formatDay(item.appointmentAt);
    const slot = map.get(key);
    if (!slot) return;
    slot.count += 1;
    if (item.paymentStatus === "paid") {
      slot.revenue += Number(item.amount) || 0;
    }
  });

  return [...map.values()];
};

const buildStatsPayload = ({ appointments, doctorsCount = 0, newPatients = 0 }) => {
  const total = appointments.length;
  const statusCounts = APPOINTMENT_STATUSES.reduce(
    (acc, key) => ({ ...acc, [key]: 0 }),
    {}
  );

  let paidCount = 0;
  let monthlyRevenue = 0;
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const doctorCountMap = new Map();
  appointments.forEach((item) => {
    const status = item.status || "pending";
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    const doctorKey = item.doctor?._id?.toString?.() || item.doctor?._id || item.doctorName;
    const doctorName = item.doctor?.fullName || item.doctorName || "Bác sĩ";
    const specialty = item.doctor?.specialty || "Tổng quát";
    const current = doctorCountMap.get(doctorKey) || {
      doctorId: doctorKey,
      doctorName,
      specialty,
      appointments: 0,
      completed: 0,
    };
    current.appointments += 1;
    if (item.status === "completed") current.completed += 1;
    doctorCountMap.set(doctorKey, current);

    if (item.paymentStatus === "paid") {
      paidCount += 1;
      const d = new Date(item.appointmentAt);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        monthlyRevenue += Number(item.amount) || 0;
      }
    }
  });

  const chartSeries = buildChartSeries(appointments, 7);
  const maxCount = Math.max(...chartSeries.map((x) => x.count), 1);
  const chart = chartSeries.map((x) => Math.max(8, Math.round((x.count / maxCount) * 100)));

  const topDoctors = [...doctorCountMap.values()]
    .sort((a, b) => b.appointments - a.appointments)
    .slice(0, 5)
    .map((item) => ({
      ...item,
      completionRate: item.appointments
        ? Math.round((item.completed / item.appointments) * 100)
        : 0,
    }));

  return {
    cards: {
      appointmentsCount: total,
      doctorsCount,
      monthlyRevenue,
      newPatients,
    },
    chart,
    statusCounts,
    paidCount,
    topDoctors,
    chartSeries,
  };
};

router.use(authRequired, requireRole("admin"));

router.get("/overview", async (req, res, next) => {
  try {
    if (useMemoryAuth) {
      const appointments = listMemoryAppointments({});
      const stats = buildStatsPayload({
        appointments,
        doctorsCount: listMemoryDoctors().length,
        newPatients: 0,
      });

      return res.json({
        cards: stats.cards,
        chart: stats.chart,
        recentAppointments: appointments.slice(0, 10),
      });
    }

    const [appointments, doctorsCount, customersCount] = await Promise.all([
      Appointment.find()
        .populate("user", "fullName")
        .populate("doctor", "fullName specialty")
        .sort({ createdAt: -1 }),
      Doctor.countDocuments(),
      User.countDocuments({ role: "customer" }),
    ]);

    const stats = buildStatsPayload({
      appointments,
      doctorsCount,
      newPatients: customersCount,
    });

    return res.json({
      cards: stats.cards,
      chart: stats.chart,
      recentAppointments: appointments.slice(0, 10),
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/appointments", async (req, res, next) => {
  try {
    const { status = "", q = "", doctorId = "", dateFrom = "", dateTo = "" } = req.query;

    if (useMemoryAuth) {
      const appointments = listMemoryAppointments({ status, q, doctorId, dateFrom, dateTo });
      return res.json({ appointments });
    }

    const filter = {};
    if (status && APPOINTMENT_STATUSES.includes(status)) filter.status = status;
    if (doctorId && mongoose.Types.ObjectId.isValid(doctorId)) {
      filter.doctor = doctorId;
    }
    if (dateFrom || dateTo) {
      filter.appointmentAt = {};
      if (dateFrom) filter.appointmentAt.$gte = new Date(dateFrom);
      if (dateTo) filter.appointmentAt.$lte = new Date(dateTo);
    }

    if (q?.trim()) {
      const regex = new RegExp(q.trim(), "i");
      filter.$or = [
        { doctorName: regex },
        { hospital: regex },
        { bookingCode: regex },
        { "user.fullName": regex },
      ];
    }

    const appointments = await Appointment.find(filter)
      .populate("user", "fullName phone")
      .populate("doctor", "fullName specialty")
      .sort({ appointmentAt: -1, createdAt: -1 });

    return res.json({ appointments });
  } catch (error) {
    return next(error);
  }
});

router.patch("/appointments/:id/status", async (req, res, next) => {
  try {
    const parsed = statusUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid status" });
    }

    const { status } = parsed.data;
    if (useMemoryAuth) {
      const result = updateMemoryAppointmentStatus({ appointmentId: req.params.id, status });
      if (result.error) return res.status(result.status || 400).json({ message: result.error });
      return res.json(result);
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    appointment.status = status;
    if (status === "confirmed" && appointment.paymentStatus === "pending") {
      appointment.paymentStatus = "paid";
    }
    await appointment.save();

    const populated = await Appointment.findById(appointment._id)
      .populate("user", "fullName phone")
      .populate("doctor", "fullName specialty");

    return res.json({ appointment: populated });
  } catch (error) {
    return next(error);
  }
});

router.get("/appointments/stats", async (req, res, next) => {
  try {
    if (useMemoryAuth) {
      const appointments = listMemoryAppointments({});
      const stats = buildStatsPayload({
        appointments,
        doctorsCount: listMemoryDoctors().length,
        newPatients: 0,
      });
      return res.json(stats);
    }

    const [appointments, doctorsCount, customersCount] = await Promise.all([
      Appointment.find()
        .populate("doctor", "fullName specialty")
        .sort({ appointmentAt: -1 }),
      Doctor.countDocuments(),
      User.countDocuments({ role: "customer" }),
    ]);

    const stats = buildStatsPayload({
      appointments,
      doctorsCount,
      newPatients: customersCount,
    });
    return res.json(stats);
  } catch (error) {
    return next(error);
  }
});

router.post("/doctors", async (req, res, next) => {
  try {
    const parsed = doctorCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid doctor payload" });
    }

    const payload = parsed.data;
    const account = {
      username: payload.account?.username || "",
      email: payload.account?.email || "",
      phone: payload.account?.phone || "",
      isActive: payload.account?.isActive ?? true,
      tempPassword: payload.account?.tempPassword || "",
      updatedAt: new Date(),
    };

    if (useMemoryAuth) {
      const doctor = createMemoryDoctor({ ...payload, account });
      return res.status(201).json({ doctor });
    }

    const doctor = await Doctor.create({
      ...payload,
      account,
    });
    return res.status(201).json({ doctor });
  } catch (error) {
    return next(error);
  }
});

router.get("/doctors/:id/account", async (req, res, next) => {
  try {
    const doctorId = req.params.id;
    const doctor = useMemoryAuth
      ? getMemoryDoctorById(doctorId)
      : await Doctor.findById(doctorId);

    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    const account = doctor.account || {
      username: "",
      email: "",
      phone: "",
      tempPassword: "",
      isActive: true,
      updatedAt: null,
    };

    return res.json({
      doctor: {
        _id: doctor._id,
        fullName: doctor.fullName,
        specialty: doctor.specialty,
        hospital: doctor.hospital,
        avatarUrl: doctor.avatarUrl || "",
        avatarColor: doctor.avatarColor || "#2b7edb",
      },
      account,
    });
  } catch (error) {
    return next(error);
  }
});

router.patch("/doctors/:id/account", async (req, res, next) => {
  try {
    const parsed = doctorAccountSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid account payload" });
    }

    if (useMemoryAuth) {
      const result = updateMemoryDoctorAccount({
        doctorId: req.params.id,
        account: parsed.data,
      });
      if (result.error) return res.status(result.status || 400).json({ message: result.error });
      return res.json(result);
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    const current = doctor.account || {};
    doctor.account = {
      username: parsed.data.username ?? current.username ?? "",
      email: parsed.data.email ?? current.email ?? "",
      phone: parsed.data.phone ?? current.phone ?? "",
      tempPassword: parsed.data.tempPassword ?? current.tempPassword ?? "",
      isActive: parsed.data.isActive ?? current.isActive ?? true,
      updatedAt: new Date(),
    };
    await doctor.save();

    return res.json({ account: doctor.account });
  } catch (error) {
    return next(error);
  }
});

// Delete doctor account (reset account info)
router.delete("/doctors/:id/account", async (req, res, next) => {
  try {
    if (useMemoryAuth) {
      const result = deleteMemoryDoctorAccount(req.params.id);
      if (result.error) return res.status(result.status || 400).json({ message: result.error });
      return res.json(result);
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    doctor.account = {
      username: "",
      email: "",
      phone: "",
      tempPassword: "",
      isActive: false,
      updatedAt: new Date(),
    };
    await doctor.save();

    return res.json({ account: doctor.account });
  } catch (error) {
    return next(error);
  }
});

// Delete doctor
router.delete("/doctors/:id", async (req, res, next) => {
  try {
    if (useMemoryAuth) {
      const result = deleteMemoryDoctor(req.params.id);
      if (result.error) return res.status(result.status || 400).json({ message: result.error });
      return res.json({ message: "Doctor deleted successfully" });
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    // Also delete associated appointments
    await Appointment.deleteMany({ doctor: req.params.id });
    
    await doctor.deleteOne();

    return res.json({ message: "Doctor deleted successfully" });
  } catch (error) {
    return next(error);
  }
});

router.get("/doctors/:id", async (req, res, next) => {
  try {
    if (useMemoryAuth) {
      const doctor = getMemoryDoctorById(req.params.id);
      if (!doctor) return res.status(404).json({ message: "Doctor not found" });

      const metrics = getMemoryDoctorStats(req.params.id);
      return res.json({
        doctor,
        metrics: {
          totalAppointments: metrics.totalAppointments,
          rating: doctor.rating || 4.9,
          completionRate: metrics.completionRate,
        },
        weeklySchedule: {
          mon: ["08:00 - 11:30", "13:30 - 17:00"],
          tue: ["08:00 - 11:30"],
          wed: ["08:00 - 11:30", "13:30 - 17:00"],
          thu: ["Trong"],
          fri: ["08:00 - 11:30", "13:30 - 17:00"],
          sat: ["Nghi"],
        },
        reviews: [
          {
            name: "Tran Van Tu",
            content:
              "Bac si rat nhiet tinh va chu dao. Giai thich benh tinh rat can ke, toi cam thay rat yen tam khi dieu tri.",
            stars: 5,
            ago: "2 ngay truoc",
          },
        ],
      });
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    const doctorAppointments = await Appointment.countDocuments({ doctor: doctor._id });
    const completedCount = await Appointment.countDocuments({
      doctor: doctor._id,
      status: "completed",
    });

    return res.json({
      doctor,
      metrics: {
        totalAppointments: doctorAppointments || 0,
        rating: doctor.rating || 4.9,
        completionRate:
          doctorAppointments > 0 ? Math.round((completedCount / doctorAppointments) * 100) : 0,
      },
      weeklySchedule: {
        mon: ["08:00 - 11:30", "13:30 - 17:00"],
        tue: ["08:00 - 11:30"],
        wed: ["08:00 - 11:30", "13:30 - 17:00"],
        thu: ["Trong"],
        fri: ["08:00 - 11:30", "13:30 - 17:00"],
        sat: ["Nghi"],
      },
      reviews: [
        {
          name: "Tran Van Tu",
          content:
            "Bác sĩ rất nhiệt tình và chủ động. Giải thích bệnh tình rất cần kể, tôi cảm thấy rất yên tâm khi điều trị.",
          stars: 5,
          ago: "2 ngay truoc",
        },
        {
          name: "Le Hong Hanh",
          content:
            "Kinh nghiem cua bac si thuc su tuyet voi. Toi da do benh rat nhieu sau lo trinh dieu tri dau tien.",
          stars: 5,
          ago: "1 tuan truoc",
        },
      ],
    });
  } catch (error) {
    return next(error);
  }
});

// AI Analytics endpoint
router.post("/ai-analytics", async (req, res, next) => {
  try {
    const { type = "overview", doctorId } = req.body;

    if (type === "doctor" && doctorId) {
      // Get doctor performance insights
      let doctorStats;
      if (useMemoryAuth) {
        const stats = getMemoryDoctorStats(doctorId);
        const doctor = getMemoryDoctorById(doctorId);
        if (!doctor) {
          return res.status(404).json({ message: "Doctor not found" });
        }
        doctorStats = {
          doctorName: doctor.fullName,
          specialty: doctor.specialty,
          appointments: stats.totalAppointments,
          completionRate: stats.completionRate,
        };
      } else {
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
          return res.status(404).json({ message: "Doctor not found" });
        }
        const appointments = await Appointment.find({ doctor: doctorId });
        const completed = appointments.filter((a) => a.status === "completed").length;
        doctorStats = {
          doctorName: doctor.fullName,
          specialty: doctor.specialty,
          appointments: appointments.length,
          completionRate: appointments.length ? Math.round((completed / appointments.length) * 100) : 0,
        };
      }

      const insights = await generateDoctorPerformanceInsights(doctorStats);
      return res.json({ insights });
    }

    // Get overview stats for AI analysis
    let appointments, doctorsCount, customersCount;
    if (useMemoryAuth) {
      appointments = listMemoryAppointments({});
      doctorsCount = listMemoryDoctors().length;
      customersCount = 0;
    } else {
      [appointments, doctorsCount, customersCount] = await Promise.all([
        Appointment.find().populate("doctor", "fullName specialty"),
        Doctor.countDocuments(),
        User.countDocuments({ role: "customer" }),
      ]);
    }

    const stats = buildStatsPayload({
      appointments,
      doctorsCount,
      newPatients: customersCount,
    });

    const aiData = {
      totalAppointments: stats.cards.appointmentsCount,
      pendingAppointments: stats.statusCounts.pending || 0,
      confirmedAppointments: stats.statusCounts.confirmed || 0,
      completedAppointments: stats.statusCounts.completed || 0,
      cancelledAppointments: stats.statusCounts.cancelled || 0,
      totalDoctors: stats.cards.doctorsCount,
      monthlyRevenue: stats.cards.monthlyRevenue,
      newPatients: stats.cards.newPatients,
      topDoctors: stats.topDoctors,
      chartData: stats.chart,
    };

    const insights = await generateAIInsights(aiData);
    return res.json({ insights });
  } catch (error) {
    console.error("AI Analytics error:", error);
    return res.status(500).json({ message: error.message || "Không thể tạo phân tích AI" });
  }
});

export default router;
