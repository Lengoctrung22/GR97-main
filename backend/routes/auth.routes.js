import { Router } from "express";
import { z } from "zod";
import { User } from "../models/User.js";
import { signToken } from "../utils/jwt.js";
import { validateBody } from "../middlewares/validate.js";
import { authRequired } from "../middlewares/auth.js";
import {
  comparePassword as compareMemoryPassword,
  createUser as createMemoryUser,
  findByCitizenId,
  findByEmail,
  findById as findMemoryById,
  findByIdentifier,
  findByPhone,
  mapUserResponse,
  generatePasswordResetToken,
  findUserByResetToken,
  resetUserPassword,
  clearResetToken,
} from "../services/memoryAuth.js";
import { sendWelcomeEmail, sendLoginNotificationEmail } from "../services/email.service.js";
import crypto from "crypto";

const router = Router();
const useMemoryAuth = process.env.IN_MEMORY_AUTH === "1";

const registerSchema = z.object({
  fullName: z.string().min(2).max(80),
  email: z.string().email().optional(),
  password: z.string().min(6).max(100).optional(),
  phone: z.string().min(8).max(20),
  birthDate: z.string().optional(),
  citizenId: z.string().max(32).optional().default(""),
});

const loginSchema = z.object({
  identifier: z.string().min(3).max(120),
  password: z.string().min(6).max(100),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(6).max(100),
});

router.post("/register", validateBody(registerSchema), async (req, res, next) => {
  try {
    const { fullName, email, password, phone, birthDate, citizenId } = req.body;

    const normalizedEmail = email?.toLowerCase()?.trim();
    const normalizedPhone = phone.trim();
    const normalizedCitizenId = citizenId?.trim();

    if (useMemoryAuth) {
      if (normalizedEmail && findByEmail(normalizedEmail)) {
        return res.status(409).json({ message: "Email already exists" });
      }
      if (findByPhone(normalizedPhone)) {
        return res.status(409).json({ message: "Phone already exists" });
      }
      if (normalizedCitizenId && findByCitizenId(normalizedCitizenId)) {
        return res.status(409).json({ message: "Citizen ID already exists" });
      }
    } else {
      if (normalizedEmail) {
        const emailExists = await User.findOne({ email: normalizedEmail });
        if (emailExists) {
          return res.status(409).json({ message: "Email already exists" });
        }
      }

      const phoneExists = await User.findOne({ phone: normalizedPhone });
      if (phoneExists) {
        return res.status(409).json({ message: "Phone already exists" });
      }

      if (normalizedCitizenId) {
        const citizenExists = await User.findOne({ citizenId: normalizedCitizenId });
        if (citizenExists) {
          return res.status(409).json({ message: "Citizen ID already exists" });
        }
      }
    }

    const generatedEmail =
      normalizedEmail ||
      `u${Date.now()}_${normalizedPhone.replace(/\D/g, "").slice(-8)}@healthyai.local`;
    const generatedPassword = password || `${normalizedPhone.slice(-6)}Aa!`;

    const parsedBirthDate = birthDate ? new Date(birthDate) : null;
    if (birthDate && Number.isNaN(parsedBirthDate?.getTime?.())) {
      return res.status(400).json({ message: "Invalid birthDate" });
    }

    const user = useMemoryAuth
      ? await createMemoryUser({
          fullName,
          email: generatedEmail,
          password: generatedPassword,
          phone: normalizedPhone,
          birthDate: parsedBirthDate,
          citizenId: normalizedCitizenId || "",
        })
      : await User.create({
          fullName,
          email: generatedEmail,
          password: generatedPassword,
          phone: normalizedPhone,
          birthDate: parsedBirthDate,
          citizenId: normalizedCitizenId || "",
        });

    const token = signToken({
      userId: user._id?.toString ? user._id.toString() : user._id,
      role: user.role,
    });

    // Send welcome email (non-blocking)
    const userEmail = useMemoryAuth ? user.email : user.email;
    const userFullName = useMemoryAuth ? user.fullName : user.fullName;
    sendWelcomeEmail(userEmail, userFullName).catch(err => 
      console.error("Failed to send welcome email:", err.message)
    );

    return res.status(201).json({
      token,
      generatedPassword: password ? null : generatedPassword,
      user: useMemoryAuth ? mapUserResponse(user) : {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    if (error?.name === "MongoServerError" && error?.code === 11000) {
      const duplicateField = Object.keys(error?.keyPattern || {})[0] || "field";
      return res.status(409).json({ message: `${duplicateField} already exists` });
    }
    if (error?.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    console.error("Register error:", error);
    return res.status(500).json({
      message: "Register failed. Please try again.",
      detail: process.env.NODE_ENV === "production" ? undefined : error?.message,
    });
  }
});

router.post("/login", validateBody(loginSchema), async (req, res, next) => {
  try {
    const { identifier, password } = req.body;
    const normalized = identifier.trim().toLowerCase();
    const isEmail = normalized.includes("@");

    console.log("Login attempt:", identifier);
    
    const user = useMemoryAuth
      ? findByIdentifier(identifier)
      : await User.findOne(
          isEmail ? { email: normalized } : { phone: identifier.trim() }
        ).select("+password");

    if (!user) {
      console.log("User not found");
      return res.status(401).json({ message: "Invalid credentials" });
    }

    console.log("User found:", user.email, "role:", user.role);
    
    const isValid = useMemoryAuth
      ? await compareMemoryPassword(user, password)
      : await user.comparePassword(password);
    if (!isValid) {
      console.log("Invalid password");
      return res.status(401).json({ message: "Invalid credentials" });
    }

    console.log("Login successful, role:", user.role);
    
    const token = signToken({
      userId: user._id?.toString ? user._id.toString() : user._id,
      role: user.role,
    });

    // Send login notification email (non-blocking)
    const userEmail = useMemoryAuth ? user.email : user.email;
    const userFullName = useMemoryAuth ? user.fullName : user.fullName;
    const ipAddress = req.ip || req.connection?.remoteAddress || "Unknown";
    sendLoginNotificationEmail(userEmail, userFullName, new Date().toISOString(), ipAddress).catch(err =>
      console.error("Failed to send login notification:", err.message)
    );

    const userResponse = useMemoryAuth ? mapUserResponse(user) : {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };
    console.log("Sending response:", userResponse);
    return res.status(200).json({
      token,
      user: userResponse,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      message: "Login failed. Please try again.",
      detail: process.env.NODE_ENV === "production" ? undefined : error?.message,
    });
  }
});

router.get("/me", authRequired, async (req, res, next) => {
  try {
    const user = useMemoryAuth
      ? findMemoryById(req.user.userId)
      : await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({
      user: useMemoryAuth ? mapUserResponse(user) : {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    return next(error);
  }
});

// Refresh token - Issue new token without requiring login
router.post("/refresh", authRequired, async (req, res, next) => {
  try {
    const user = useMemoryAuth
      ? findMemoryById(req.user.userId)
      : await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const newToken = signToken({
      userId: user._id?.toString ? user._id.toString() : user._id,
      role: user.role,
    });

    return res.status(200).json({
      token: newToken,
      user: useMemoryAuth ? mapUserResponse(user) : {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    return res.status(500).json({ message: "Failed to refresh token" });
  }
});

// Forgot Password - Send reset link to email
router.post("/forgot-password", validateBody(forgotPasswordSchema), async (req, res, next) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    let user = null;
    let resetData = null;

    if (useMemoryAuth) {
      resetData = generatePasswordResetToken(normalizedEmail);
      if (resetData) {
        user = resetData.user;
      }
    } else {
      user = await User.findOne({ email: normalizedEmail });
      if (user) {
        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString("hex");
        const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = resetExpires;
        await user.save();
        
        resetData = { token: resetToken, expires: resetExpires };
      }
    }

    // Always return success to prevent email enumeration
    // But only send email if user exists
    if (user && resetData) {
      const userEmail = useMemoryAuth ? user.email : user.email;
      const userFullName = useMemoryAuth ? user.fullName : user.fullName;
      
      // Send password reset email (non-blocking)
      const { sendPasswordResetEmail } = await import("../services/email.service.js");
      sendPasswordResetEmail(userEmail, userFullName, resetData.token).catch(err =>
        console.error("Failed to send password reset email:", err.message)
      );
    }

    return res.status(200).json({
      message: "If an account exists with this email, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ message: "An error occurred. Please try again." });
  }
});

// Reset Password - Set new password using token
router.post("/reset-password", validateBody(resetPasswordSchema), async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    let user = null;

    if (useMemoryAuth) {
      const result = await resetUserPassword(token, newPassword);
      if (result.error) {
        return res.status(result.status).json({ message: result.error });
      }
      return res.status(200).json({ message: "Password has been reset successfully." });
    } else {
      user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: new Date() },
      });

      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      user.password = newPassword;
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();

      return res.status(200).json({ message: "Password has been reset successfully." });
    }
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ message: "An error occurred. Please try again." });
  }
});

export default router;
