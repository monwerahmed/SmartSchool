// ============================================================
// src/utils/emailSender.js
// Nodemailer — sends OTP via email
// ============================================================
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,       // e.g. smtp.gmail.com
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,                      // true for port 465
  auth: {
    user: process.env.SMTP_USER,      // your smtp email
    pass: process.env.SMTP_PASS,      // app password
  },
});

/**
 * Send OTP email
 * @param {string} to - recipient email
 * @param {string} otp - plain OTP code (6 digits)
 * @param {string} purpose - "CHANGE_USERNAME" | "CHANGE_PASSWORD"
 */
export const sendOTPEmail = async (to, otp, purpose) => {

  console.log("SMTP HOST : ", process.env.SMTP_PASS);
  const purposeLabel =
    purpose === "CHANGE_USERNAME" ? "change your username" : "change your password";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #1a1a2e; margin-bottom: 8px;">Security Verification</h2>
      <p style="color: #555; margin-bottom: 24px;">
        You requested to <strong>${purposeLabel}</strong> on your school account.
        Use the OTP below to proceed.
      </p>
      <div style="background: #f4f4f8; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <span style="font-size: 36px; font-weight: bold; letter-spacing: 12px; color: #1a1a2e;">
          ${otp}
        </span>
      </div>
      <p style="color: #888; font-size: 13px;">
        This OTP expires in <strong>5 minutes</strong>. Do not share it with anyone.
        If you did not request this, please contact your administrator immediately.
      </p>
    </div>
  `;
  transporter.verify((error, success) => {
    if (error) {
      console.error(" Transporter connection failed:", error);
    } else {
      console.log(" Server is ready to send emails");
    }
  });

  await transporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME || "School System"}" <${process.env.SMTP_USER}>`,
    to,
    subject: `Your OTP to ${purposeLabel}`,
    html,
  });
};