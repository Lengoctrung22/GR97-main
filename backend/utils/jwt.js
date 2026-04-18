import jwt from "jsonwebtoken";

let warnedMissingSecret = false;

const getSecret = () => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;

  if (!warnedMissingSecret) {
    console.warn(
      "JWT_SECRET is missing. Using temporary dev secret. Set JWT_SECRET in backend/.env."
    );
    warnedMissingSecret = true;
  }
  return "healthyai_dev_fallback_secret";
};

export const signToken = (payload) => {
  const secret = getSecret();

  return jwt.sign(payload, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

export const verifyToken = (token) => {
  const secret = getSecret();

  return jwt.verify(token, secret);
};
