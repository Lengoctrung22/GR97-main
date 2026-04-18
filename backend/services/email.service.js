import nodemailer from "nodemailer";

// Create transporter based on environment configuration
const createTransporter = () => {
  const emailHost = process.env.EMAIL_HOST || "smtp.gmail.com";
  const emailPort = parseInt(process.env.EMAIL_PORT || "587");
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  const emailFrom = process.env.EMAIL_FROM || process.env.EMAIL_USER;

  // If no email credentials are configured, use ethereal for testing
  if (!emailUser || !emailPass) {
    console.warn("Email credentials not configured. Using ethereal test account.");
    return nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: "test@ethereal.email",
        pass: "testpass",
      },
    });
  }

  return nodemailer.createTransport({
    host: emailHost,
    port: emailPort,
    secure: emailPort === 465,
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });
};

const transporter = createTransporter();

/**
 * Send registration welcome email to user
 * @param {string} email - User's email address
 * @param {string} fullName - User's full name
 * @returns {Promise<boolean>} - Returns true if email sent successfully
 */
export const sendWelcomeEmail = async (email, fullName) => {
  try {
    // Skip if email is a local test email
    if (email.endsWith("@healthyai.local")) {
      console.log(`Skipping welcome email for local test email: ${email}`);
      return true;
    }

    const mailOptions = {
      from: `"HealthyAI" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: email,
      subject: "Welcome to HealthyAI! 🎉",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px;">
            <h1 style="color: white; margin: 0;">Welcome to HealthyAI! 🎉</h1>
          </div>
          
          <div style="padding: 20px; background: #f9f9f9; border-radius: 0 0 10px 10px;">
            <p>Hello <strong>${fullName}</strong>,</p>
            
            <p>Thank you for registering with <strong>HealthyAI</strong>!</p>
            
            <p>We're excited to have you on board. With HealthyAI, you can:</p>
            <ul>
              <li>Book appointments with doctors</li>
              <li>Chat with healthcare assistants</li>
              <li>View your medical records</li>
              <li>Get AI-powered health insights</li>
            </ul>
            
            <p>If you have any questions, feel free to reach out to our support team.</p>
            
            <p style="margin-top: 30px;">
              Best regards,<br>
              The HealthyAI Team
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
            <p>This is an automated message from HealthyAI. Please do not reply to this email.</p>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${email}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`Failed to send welcome email to ${email}:`, error.message);
    return false;
  }
};

/**
 * Send login notification email to user
 * @param {string} email - User's email address
 * @param {string} fullName - User's full name
 * @param {string} loginTime - Login timestamp
 * @param {string} ipAddress - User's IP address (optional)
 * @returns {Promise<boolean>} - Returns true if email sent successfully
 */
export const sendLoginNotificationEmail = async (email, fullName, loginTime, ipAddress = "Unknown") => {
  try {
    // Skip if email is a local test email
    if (email.endsWith("@healthyai.local")) {
      console.log(`Skipping login notification for local test email: ${email}`);
      return true;
    }

    const formattedTime = new Date(loginTime).toLocaleString("en-US", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const mailOptions = {
      from: `"HealthyAI" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: email,
      subject: "New Login to Your HealthyAI Account 🔔",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px;">
            <h1 style="color: white; margin: 0;">New Login Detected 🔔</h1>
          </div>
          
          <div style="padding: 20px; background: #f9f9f9; border-radius: 0 0 10px 10px;">
            <p>Hello <strong>${fullName}</strong>,</p>
            
            <p>We detected a new login to your <strong>HealthyAI</strong> account.</p>
            
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <p style="margin: 5px 0;"><strong>📅 Time:</strong> ${formattedTime}</p>
              <p style="margin: 5px 0;"><strong>🌐 IP Address:</strong> ${ipAddress}</p>
            </div>
            
            <p>If this was you, you can safely ignore this email.</p>
            
            <p style="color: #e74c3c;">
              <strong>⚠️ If this wasn't you:</strong> Please change your password immediately and contact our support team.
            </p>
            
            <p style="margin-top: 30px;">
              Best regards,<br>
              The HealthyAI Team
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
            <p>This is an automated message from HealthyAI. Please do not reply to this email.</p>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Login notification email sent to ${email}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`Failed to send login notification to ${email}:`, error.message);
    return false;
  }
};

/**
 * Send appointment confirmation email to user
 * @param {string} email - User's email address
 * @param {string} fullName - User's full name
 * @param {string} doctorName - Doctor's name
 * @param {Date|string} appointmentAt - Appointment date and time
 * @param {string} hospital - Hospital name (optional)
 * @param {string} bookingCode - Booking code (optional)
 * @returns {Promise<boolean>} - Returns true if email sent successfully
 */
export const sendAppointmentConfirmationEmail = async (
  email,
  fullName,
  doctorName,
  appointmentAt,
  hospital = "",
  bookingCode = ""
) => {
  try {
    // Skip if email is a local test email
    if (email.endsWith("@healthyai.local")) {
      console.log(`Skipping appointment confirmation for local test email: ${email}`);
      return true;
    }

    const appointmentDate = new Date(appointmentAt);
    const formattedDate = appointmentDate.toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedTime = appointmentDate.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const mailOptions = {
      from: `"HealthyAI" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: email,
      subject: `Xác nhận đặt lịch khám thành công - Bác sĩ ${doctorName} 📅`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px;">
            <h1 style="color: white; margin: 0;">Xác nhận đặt lịch khám ✅</h1>
          </div>
          
          <div style="padding: 20px; background: #f9f9f9; border-radius: 0 0 10px 10px;">
            <p>Xin chào <strong>${fullName}</strong>,</p>
            
            <p>Lịch khám của bạn đã được đặt thành công!</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
              <h3 style="margin-top: 0; color: #28a745;">Thông tin lịch hẹn</h3>
              <p style="margin: 10px 0;"><strong>👨‍⚕️ Bác sĩ:</strong> ${doctorName}</p>
              <p style="margin: 10px 0;"><strong>📅 Ngày:</strong> ${formattedDate}</p>
              <p style="margin: 10px 0;"><strong>⏰ Giờ:</strong> ${formattedTime}</p>
              ${hospital ? `<p style="margin: 10px 0;"><strong>🏥 Bệnh viện:</strong> ${hospital}</p>` : ""}
              ${bookingCode ? `<p style="margin: 10px 0;"><strong>📝 Mã đặt lịch:</strong> ${bookingCode}</p>` : ""}
            </div>
            
            <p>Vui lòng đến đúng giờ và mang theo các giấy tờ cần thiết.</p>
            
            <p style="margin-top: 30px;">
              Trân trọng,<br>
              Đội ngũ HealthyAI
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
            <p>Đây là email tự động từ HealthyAI. Vui lòng không trả lời email này.</p>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Appointment confirmation email sent to ${email}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`Failed to send appointment confirmation to ${email}:`, error.message);
    return false;
  }
};

/**
 * Send password reset email to user
 * @param {string} email - User's email address
 * @param {string} fullName - User's full name
 * @param {string} resetToken - Password reset token
 * @returns {Promise<boolean>} - Returns true if email sent successfully
 */
export const sendPasswordResetEmail = async (email, fullName, resetToken) => {
  try {
    // Skip if email is a local test email
    if (email.endsWith("@healthyai.local")) {
      console.log(`Skipping password reset email for local test email: ${email}`);
      return true;
    }

    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    const mailOptions = {
      from: `"HealthyAI" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: email,
      subject: "Reset Your HealthyAI Password 🔐",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px;">
            <h1 style="color: white; margin: 0;">Reset Your Password 🔐</h1>
          </div>
          
          <div style="padding: 20px; background: #f9f9f9; border-radius: 0 0 10px 10px;">
            <p>Hello <strong>${fullName}</strong>,</p>
            
            <p>We received a request to reset your <strong>HealthyAI</strong> account password.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              Or copy and paste this link in your browser:<br>
              <span style="color: #667eea;">${resetUrl}</span>
            </p>
            
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <p style="margin: 0; color: #856404;">
                <strong>⚠️ Important:</strong> This link will expire in 1 hour for security reasons.<br>
                If you didn't request a password reset, please ignore this email.
              </p>
            </div>
            
            <p style="margin-top: 30px;">
              Best regards,<br>
              The HealthyAI Team
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
            <p>This is an automated message from HealthyAI. Please do not reply to this email.</p>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`Failed to send password reset email to ${email}:`, error.message);
    return false;
  }
};

export default {
  sendWelcomeEmail,
  sendLoginNotificationEmail,
  sendAppointmentConfirmationEmail,
  sendPasswordResetEmail,
};
