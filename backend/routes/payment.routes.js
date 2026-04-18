import { Router } from "express";
import crypto from "crypto";
import { authRequired } from "../middlewares/auth.js";
import { Appointment } from "../models/Appointment.js";
import { markBookingPaid } from "../services/memoryClinic.js";

const router = Router();

const useMemoryAuth = process.env.IN_MEMORY_AUTH === "1";

// Create payment
router.post("/create", authRequired, async (req, res) => {
  try {
    const { bookingCode, bankCode, paymentMethod } = req.body;

    if (!bookingCode) {
      return res.status(400).json({ message: "Booking code is required" });
    }

    // Get booking info
    let booking;
    if (useMemoryAuth) {
      const { listAppointmentsByUser } = await import("../services/memoryClinic.js");
      const appointments = listAppointmentsByUser(req.user.userId);
      booking = appointments.find((a) => a.bookingCode === bookingCode);
    } else {
      booking = await Appointment.findOne({ bookingCode, user: req.user.userId });
    }

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Build payment info
    const { buildPaymentInfo, getClientIp } = await import("../services/payment.service.js");
    const paymentInfo = buildPaymentInfo({
      amount: booking.amount || booking.totalAmount || 0,
      bookingCode: booking.bookingCode,
      orderInfo: `Thanh toan lich kham ${bookingCode}`,
      ipAddr: getClientIp(req),
    });

    return res.json(paymentInfo);
  } catch (error) {
    console.error("Create payment error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Verify VNPay hash
const verifyVnpayHash = (params, hashSecret) => {
  const { vnp_SecureHash, ...data } = params;
  if (!vnp_SecureHash || !hashSecret) return false;

  const sortedKeys = Object.keys(data).sort();
  const signData = sortedKeys
    .filter((key) => key.startsWith("vnp_"))
    .map((key) => `${key}=${data[key]}`)
    .join("&");

  const secureHash = crypto
    .createHmac("sha512", hashSecret)
    .update(Buffer.from(signData, "utf-8"))
    .digest("hex");

  return secureHash === vnp_SecureHash;
};

// VNPay IPN (Instant Payment Notification) - called by VNPay server
router.get("/ipn", async (req, res) => {
  try {
    const params = req.query;
    const hashSecret = process.env.VNPAY_HASH_SECRET;

    // Verify hash
    if (!verifyVnpayHash(params, hashSecret)) {
      console.error("VNPay hash verification failed");
      return res.status(400).json({ RspCode: "97", Message: "Invalid signature" });
    }

    const responseCode = params.vnp_ResponseCode;
    const bookingCode = params.vnp_TxnRef?.split("-")[0] || "";

    if (responseCode === "00") {
      // Payment successful
      if (useMemoryAuth) {
        const { listAppointmentsByUser } = await import("../services/memoryClinic.js");
        // Find appointment by bookingCode across all users
        // Since we don't have a direct function to get all appointments,
        // we'll use a workaround by checking the appointments array directly
        const { appointments } = await import("../services/memoryClinic.js");
        const appointment = appointments.find(a => a.bookingCode === bookingCode);
        if (appointment) {
          appointment.paymentStatus = "paid";
          appointment.status = "confirmed";
        }
      } else {
        // MongoDB mode
        const appointment = await Appointment.findOne({ bookingCode });
        if (!appointment) {
          return res.status(404).json({ RspCode: "01", Message: "Appointment not found" });
        }
        appointment.paymentStatus = "paid";
        appointment.status = "confirmed";
        await appointment.save();
      }

      return res.json({ RspCode: "00", Message: "Success" });
    }

    // Payment failed or cancelled
    return res.json({ RspCode: responseCode, Message: "Payment failed or cancelled" });
  } catch (error) {
    console.error("VNPay IPN error:", error);
    return res.status(500).json({ RspCode: "99", Message: "Internal server error" });
  }
});

// VNPay Return - called after payment (user redirected back)
router.get("/return", async (req, res) => {
  try {
    const params = req.query;
    const hashSecret = process.env.VNPAY_HASH_SECRET;

    // Verify hash
    if (!verifyVnpayHash(params, hashSecret)) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/payment-result?success=false&message=Invalid+signature`
      );
    }

    const responseCode = params.vnp_ResponseCode;
    const bookingCode = params.vnp_TxnRef?.split("-")[0] || "";

    if (responseCode === "00") {
      // Payment successful - update status
      if (useMemoryAuth) {
        const { appointments } = await import("../services/memoryClinic.js");
        const appointment = appointments.find(a => a.bookingCode === bookingCode);
        if (appointment) {
          appointment.paymentStatus = "paid";
          appointment.status = "confirmed";
        }
      } else {
        const appointment = await Appointment.findOne({ bookingCode });
        if (appointment) {
          appointment.paymentStatus = "paid";
          appointment.status = "confirmed";
          await appointment.save();
        }
      }

      return res.redirect(
        `${process.env.FRONTEND_URL}/payment-result?success=true&bookingCode=${bookingCode}`
      );
    }

    // Payment failed or cancelled
    return res.redirect(
      `${process.env.FRONTEND_URL}/payment-result?success=false&message=Payment+failed&bookingCode=${bookingCode}`
    );
  } catch (error) {
    console.error("VNPay return error:", error);
    return res.redirect(
      `${process.env.FRONTEND_URL}/payment-result?success=false&message=Internal+error`
    );
  }
});

// Get payment info
router.get("/info/:bookingCode", authRequired, async (req, res) => {
  try {
    const { bookingCode } = req.params;

    if (useMemoryAuth) {
      const { listAppointmentsByUser } = await import("../services/memoryClinic.js");
      const appointments = listAppointmentsByUser(req.user.userId);
      const appointment = appointments.find((a) => a.bookingCode === bookingCode);

      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      return res.json({
        bookingCode: appointment.bookingCode,
        amount: appointment.amount || appointment.totalAmount || 0,
        paymentStatus: appointment.paymentStatus,
        status: appointment.status,
      });
    }

    const appointment = await Appointment.findOne({ bookingCode, user: req.user.userId });
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    return res.json({
      bookingCode: appointment.bookingCode,
      amount: appointment.amount || appointment.totalAmount || 0,
      paymentStatus: appointment.paymentStatus,
      status: appointment.status,
    });
  } catch (error) {
    console.error("Get payment info error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Check payment status
router.get("/status/:bookingCode", authRequired, async (req, res) => {
  try {
    const { bookingCode } = req.params;

    if (useMemoryAuth) {
      const { listAppointmentsByUser } = await import("../services/memoryClinic.js");
      const appointments = listAppointmentsByUser(req.user.userId);
      const appointment = appointments.find((a) => a.bookingCode === bookingCode);

      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      return res.json({
        bookingCode: appointment.bookingCode,
        paymentStatus: appointment.paymentStatus,
        status: appointment.status,
      });
    }

    const appointment = await Appointment.findOne({ bookingCode, user: req.user.userId });
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    return res.json({
      bookingCode: appointment.bookingCode,
      paymentStatus: appointment.paymentStatus,
      status: appointment.status,
    });
  } catch (error) {
    console.error("Check payment status error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
