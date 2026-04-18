import crypto from "crypto";

const encode = (value) => encodeURIComponent(String(value)).replace(/%20/g, "+");

const buildEncodedQuery = (params) =>
  Object.keys(params)
    .sort()
    .map((key) => `${encode(key)}=${encode(params[key])}`)
    .join("&");

const formatVnpDate = (date = new Date()) => {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
};

const getCleanIp = (rawIp) => {
  const fallback = "127.0.0.1";
  if (!rawIp) return fallback;
  const ip = String(rawIp).split(",")[0].trim();
  if (ip === "::1") return fallback;
  if (ip.startsWith("::ffff:")) return ip.replace("::ffff:", "");
  return ip || fallback;
};

export const getClientIp = (req) =>
  getCleanIp(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "127.0.0.1");

export const buildPaymentInfo = ({ amount, bookingCode, orderInfo, ipAddr }) => {
  const paymentAmount = Number(amount) || 0;
  const tmnCode = process.env.VNPAY_TMN_CODE;
  const hashSecret = process.env.VNPAY_HASH_SECRET;
  const paymentBaseUrl = process.env.VNPAY_PAYMENT_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
  const returnUrl =
    process.env.VNPAY_RETURN_URL ||
    `${process.env.FRONTEND_URL || "http://localhost:5173"}/payment-result`;
  const ipnUrl = process.env.VNPAY_IPN_URL || `${process.env.BACKEND_URL || "http://localhost:5001"}/api/payment/ipn`;

  const fallbackPayload = `PAY|${bookingCode}|${paymentAmount}`;
  const fallbackQr = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(fallbackPayload)}`;

  if (!tmnCode || !hashSecret) {
    return {
      provider: "manual",
      bookingCode,
      amount: paymentAmount,
      paymentUrl: "",
      qrImageUrl: fallbackQr,
      note: "Chưa cấu hình VNPAY_TMN_CODE/VNPAY_HASH_SECRET. Đang dùng QR nội bộ.",
    };
  }

  const txnRef = `${bookingCode}-${Date.now().toString().slice(-6)}`;
  const params = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: tmnCode,
    vnp_Amount: Math.round(paymentAmount * 100),
    vnp_CreateDate: formatVnpDate(new Date()),
    vnp_CurrCode: "VND",
    vnp_IpAddr: getCleanIp(ipAddr),
    vnp_Locale: "vn",
    vnp_OrderInfo: orderInfo || `Thanh toán lịch khám ${bookingCode}`,
    vnp_OrderType: "other",
    vnp_ReturnUrl: returnUrl,
    vnp_TxnRef: txnRef,
  };

  // Add IPN URL if configured
  if (ipnUrl) {
    params.vnp_IpnUrl = ipnUrl;
  }

  const signData = buildEncodedQuery(params);
  const secureHash = crypto
    .createHmac("sha512", hashSecret)
    .update(Buffer.from(signData, "utf-8"))
    .digest("hex");

  const paymentUrl = `${paymentBaseUrl}?${signData}&vnp_SecureHash=${secureHash}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(paymentUrl)}`;

  return {
    provider: "vnpay",
    bookingCode,
    amount: paymentAmount,
    paymentUrl,
    qrImageUrl,
    note: "Quét QR để mở trang thanh toán VNPAY.",
  };
};
