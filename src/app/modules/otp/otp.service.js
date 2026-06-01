// ============================================================
// src/modules/otp/otp.service.js
// ============================================================
import prisma from "../../config/database.js";
import AppError from "../../error/AppError.js";
import httpStatus from "http-status";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendOTPEmail } from "../../utils/emailSender.js";
import { sendOTPSMS } from "../../utils/smsSender.js";

const OTP_EXPIRY_MINUTES = 5;
const OTP_LENGTH = 6;

// ============================================================
// HELPERS
// ============================================================

/**
 * Generate a cryptographically secure N-digit OTP string
 */
const generateOTPCode = (length = OTP_LENGTH) => {
  // Use crypto for true randomness — Math.random() is not secure
  const min = Math.pow(10, length - 1); // 100000
  const max = Math.pow(10, length) - 1; // 999999
  const range = max - min + 1;
  const bytesNeeded = Math.ceil(Math.log2(range) / 8) + 1;
  let otp;
  do {
    const randomBytes = crypto.randomBytes(bytesNeeded);
    const randomNumber = parseInt(randomBytes.toString("hex"), 16);
    otp = (randomNumber % range) + min;
  } while (otp < min || otp > max);
  return String(otp);
};

/**
 * Hash OTP with bcrypt before storing
 */
const hashOTP = async (otp) => {
  return bcrypt.hash(otp, 10);
};

/**
 * Verify a plain OTP against its stored hash
 */
const verifyOTPHash = async (plainOTP, hash) => {
  return bcrypt.compare(plainOTP, hash);
};

// ============================================================
// REQUEST OTP
// Called when user wants to change username or password
// Sends OTP to both email and phone simultaneously
// ============================================================

const requestOTPService = async (userId, purpose) => {
  // Load user with their profile to get phone and email
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      isActive: true,
      student: { select: { phone: true } },
      teacher: { select: { phone: true } },
      guardian: { select: { phone: true } },
      librarian: { select: { phone: true } },
    },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (user.isActive !== "ACTIVE") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Your account is not active. Contact your administrator."
    );
  }

  // Resolve phone from whichever profile exists
  const phone =
    user.student?.phone ||
    user.teacher?.phone ||
    user.guardian?.phone ||
    user.librarian?.phone ||
    null;

  // Generate OTP
  const plainOTP = generateOTPCode();
  const otpHash = await hashOTP(plainOTP);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Upsert — if user already has a pending OTP for this purpose, replace it
  console.log("Working properly");
  console.log(`User ID: ${userId}, Purpose: ${purpose}, Hash: ${otpHash}, Expires: ${expiresAt}`);
  await prisma.oTP.upsert({
    where: {
      userId_purpose: { userId, purpose },
    },
    update: {
      otpHash,
      expiresAt,
      createdAt: new Date(),
    },
    create: {
      userId,
      purpose,
      otpHash,
      expiresAt,
    },
  });

  // Send to email and SMS in parallel
  // We don't fail the whole request if one channel fails —
  // we collect errors and report which channels succeeded
  console.log("Working properly");

  const results = await Promise.allSettled([
    sendOTPEmail(user.email, plainOTP, purpose),
    phone
      ? sendOTPSMS(phone, plainOTP, purpose)
      : Promise.reject(new Error("No phone number on file")),
  ]);3.0
  //console.log(results);

  const emailResult = results[0];
  const smsResult = results[1];

  console.log(`EmailResult: ${user.email}`)

  console.log(`EmailResult: ${emailResult}`)

  const channels = [];
  const warnings = [];

  if (emailResult.status === "fulfilled") {
    channels.push("email");
  } else {
    warnings.push(`Email delivery failed: ${emailResult.reason?.message}`);
  }

  if (smsResult.status === "fulfilled") {
    channels.push("SMS");
  } else {
    warnings.push(
      phone
        ? `SMS delivery failed: ${smsResult.reason?.message}`
        : "SMS skipped: no phone number on file"
    );
  }
  // If BOTH channels failed, abort — user has no way to get the OTP
  if (channels.length === 0) {
    // Clean up the stored OTP since the user can't receive it
    await prisma.oTP.delete({
      where: { userId_purpose: { userId, purpose } },
    });
    throw new AppError(
      httpStatus.SERVICE_UNAVAILABLE,
      "OTP could not be delivered. Both email and SMS failed. Please contact your administrator."
    );
  }
  
  return {
    message: `OTP sent via ${channels.join(" and ")}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`,
    sentTo: {
      email: emailResult.status === "fulfilled" ? maskEmail(user.email) : null,
      phone: smsResult.status === "fulfilled" && phone ? maskPhone(phone) : null,
    },
    warnings: warnings.length > 0 ? warnings : undefined,
    expiresAt,
  };
};

// ============================================================
// VERIFY OTP + CHANGE USERNAME
// ============================================================

const changeUsernameService = async (userId, payload) => {
  const { otp, newUsername } = payload;

  // Verify the OTP first
  await consumeOTP(userId, otp, "CHANGE_USERNAME");

  // Check new username is not already taken
  const existing = await prisma.user.findUnique({
    where: { username: newUsername },
  });

  if (existing && existing.id !== userId) {
    throw new AppError(
      httpStatus.CONFLICT,
      `Username "${newUsername}" is already taken`
    );
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { username: newUsername },
    select: {
      id: true,
      username: true,
      email: true,
      isActive: true,
    },
  });

  return {
    message: "Username changed successfully",
    user: updatedUser,
  };
};

// ============================================================
// VERIFY OTP + CHANGE PASSWORD
// ============================================================

const changePasswordService = async (userId, payload) => {
  const { otp, newPassword, confirmPassword } = payload;

  if (newPassword !== confirmPassword) {
    throw new AppError(httpStatus.BAD_REQUEST, "Passwords do not match");
  }

  // Verify the OTP first
  await consumeOTP(userId, otp, "CHANGE_PASSWORD");

  // Hash the new password
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: userId },
    data: {
      password: hashedPassword,
      isFirstLogin: false, // mark that the user has now set their own password
    },
  });

  return {
    message: "Password changed successfully. Please log in again with your new password.",
  };
};

// ============================================================
// INTERNAL — Verify OTP and immediately delete it
// ============================================================

const consumeOTP = async (userId, plainOTP, purpose) => {
  const record = await prisma.oTP.findUnique({
    where: { userId_purpose: { userId, purpose } },
  });

  if (!record) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "No OTP found. Please request a new one."
    );
  }

  // Check expiry first (cheaper than bcrypt compare)
  if (new Date() > record.expiresAt) {
    // Delete expired OTP
    await prisma.oTP.delete({
      where: { userId_purpose: { userId, purpose } },
    });
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "OTP has expired. Please request a new one."
    );
  }

  // Verify the hash
  const isValid = await verifyOTPHash(plainOTP, record.otpHash);

  if (!isValid) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Invalid OTP. Please check and try again."
    );
  }

  // OTP is valid — delete it immediately (one-time use)
  await prisma.oTP.delete({
    where: { userId_purpose: { userId, purpose } },
  });
};

// ============================================================
// MASK HELPERS — for response (don't expose full email/phone)
// ============================================================

const maskEmail = (email) => {
  const [local, domain] = email.split("@");
  if (local.length <= 2) return `**@${domain}`;
  return `${local[0]}${"*".repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
};

const maskPhone = (phone) => {
  const cleaned = phone.replace(/\D/g, "");
  return `${"*".repeat(cleaned.length - 4)}${cleaned.slice(-4)}`;
};

export const otpServices = {
  requestOTPService,
  changeUsernameService,
  changePasswordService,
};