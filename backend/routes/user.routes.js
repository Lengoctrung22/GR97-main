import { Router } from "express";
import { z } from "zod";
import { authRequired } from "../middlewares/auth.js";
import { Appointment } from "../models/Appointment.js";
import { ChatMessage } from "../models/ChatMessage.js";
import { User } from "../models/User.js";
import {
  getHealthMetrics,
  getUserDashboard,
  updateHealthMetrics,
} from "../services/memoryClinic.js";
import { validateBody } from "../middlewares/validate.js";
import {
  getUserSettings as getMemoryUserSettings,
  updateUserPassword as updateMemoryUserPassword,
  updateUserPreferences as updateMemoryUserPreferences,
  updateUserProfile as updateMemoryUserProfile,
} from "../services/memoryAuth.js";

const router = Router();
const useMemoryAuth = process.env.IN_MEMORY_AUTH === "1";

const healthMetricsSchema = z.object({
  heartRate: z.number().min(30).max(220),
  bloodPressure: z.string().min(3).max(20),
  glucose: z.number().min(1).max(30),
});

const profileSchema = z.object({
  fullName: z.string().min(2).max(80),
  email: z.string().email(),
  phone: z.string().min(8).max(20),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(6).max(100),
    newPassword: z.string().min(6).max(100),
    confirmPassword: z.string().min(6).max(100),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Password confirmation does not match",
    path: ["confirmPassword"],
  });

const preferencesSchema = z
  .object({
    notifications: z
      .object({
        appointmentReminders: z.boolean(),
        labResults: z.boolean(),
        healthNews: z.boolean(),
      })
      .optional(),
    privacy: z
      .object({
        shareRecords: z.boolean(),
        hideContactInDocs: z.boolean(),
      })
      .optional(),
  })
  .refine((value) => value.notifications || value.privacy, {
    message: "notifications or privacy is required",
  });

const toDbUserResponse = (user) => ({
  id: user._id,
  fullName: user.fullName,
  email: user.email,
  phone: user.phone,
  role: user.role,
  notificationPrefs: {
    appointmentReminders: user.notificationPrefs?.appointmentReminders ?? true,
    labResults: user.notificationPrefs?.labResults ?? true,
    healthNews: user.notificationPrefs?.healthNews ?? false,
  },
  privacyPrefs: {
    shareRecords: user.privacyPrefs?.shareRecords ?? true,
    hideContactInDocs: user.privacyPrefs?.hideContactInDocs ?? true,
  },
});

router.use(authRequired);

router.get("/dashboard", async (req, res, next) => {
  try {
    const userId = req.user.userId;

    if (useMemoryAuth) {
      return res.json(getUserDashboard(userId));
    }

    const [appointmentsCount, upcomingCount, chatCount, upcomingAppointment] = await Promise.all([
      Appointment.countDocuments({ user: userId }),
      Appointment.countDocuments({
        user: userId,
        appointmentAt: { $gte: new Date() },
        status: { $in: ["pending", "confirmed"] },
      }),
      ChatMessage.countDocuments({ user: userId }),
      Appointment.findOne({
        user: userId,
        appointmentAt: { $gte: new Date() },
        status: { $in: ["pending", "confirmed"] },
      })
        .populate("service")
        .populate("doctor")
        .sort({ appointmentAt: 1 }),
    ]);

    return res.json({
      stats: {
        appointmentsCount,
        upcomingCount,
        chatCount,
      },
      upcomingAppointment,
      healthMetrics: getHealthMetrics(userId),
    });
  } catch (error) {
    return next(error);
  }
});

router.patch(
  "/health-metrics",
  validateBody(healthMetricsSchema),
  async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const healthMetrics = updateHealthMetrics(userId, req.body);
      return res.json({ healthMetrics });
    } catch (error) {
      return next(error);
    }
  }
);

router.get("/settings", async (req, res, next) => {
  try {
    if (useMemoryAuth) {
      const payload = getMemoryUserSettings(req.user.userId);
      if (!payload) return res.status(404).json({ message: "User not found" });
      return res.json(payload);
    }

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({
      profile: toDbUserResponse(user),
      notifications: toDbUserResponse(user).notificationPrefs,
      privacy: toDbUserResponse(user).privacyPrefs,
    });
  } catch (error) {
    return next(error);
  }
});

router.patch("/profile", validateBody(profileSchema), async (req, res, next) => {
  try {
    const { fullName, email, phone } = req.body;

    if (useMemoryAuth) {
      const result = updateMemoryUserProfile({
        userId: req.user.userId,
        fullName,
        email,
        phone,
      });
      if (result.error) {
        return res.status(result.status || 400).json({ message: result.error });
      }
      return res.json({ user: result.user });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();

    const emailOwner = await User.findOne({ email: normalizedEmail });
    if (emailOwner && emailOwner._id.toString() !== req.user.userId) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const phoneOwner = await User.findOne({ phone: normalizedPhone });
    if (phoneOwner && phoneOwner._id.toString() !== req.user.userId) {
      return res.status(409).json({ message: "Phone already exists" });
    }

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.fullName = fullName;
    user.email = normalizedEmail;
    user.phone = normalizedPhone;
    await user.save();

    return res.json({ user: toDbUserResponse(user) });
  } catch (error) {
    return next(error);
  }
});

router.patch("/password", validateBody(passwordSchema), async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (useMemoryAuth) {
      const result = await updateMemoryUserPassword({
        userId: req.user.userId,
        currentPassword,
        newPassword,
      });
      if (result.error) {
        return res.status(result.status || 400).json({ message: result.error });
      }
      return res.json({ message: "Password updated successfully" });
    }

    const user = await User.findById(req.user.userId).select("+password");
    if (!user) return res.status(404).json({ message: "User not found" });

    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    user.password = newPassword;
    await user.save();

    return res.json({ message: "Password updated successfully" });
  } catch (error) {
    return next(error);
  }
});

router.patch("/preferences", validateBody(preferencesSchema), async (req, res, next) => {
  try {
    const { notifications, privacy } = req.body;

    if (useMemoryAuth) {
      const result = updateMemoryUserPreferences({
        userId: req.user.userId,
        notifications,
        privacy,
      });
      if (result.error) {
        return res.status(result.status || 400).json({ message: result.error });
      }
      return res.json(result);
    }

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (notifications) {
      user.notificationPrefs = {
        ...(user.notificationPrefs || {}),
        ...notifications,
      };
    }

    if (privacy) {
      user.privacyPrefs = {
        ...(user.privacyPrefs || {}),
        ...privacy,
      };
    }

    await user.save();

    return res.json({
      notifications: toDbUserResponse(user).notificationPrefs,
      privacy: toDbUserResponse(user).privacyPrefs,
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
