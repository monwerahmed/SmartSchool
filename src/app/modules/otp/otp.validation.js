// ============================================================
// src/modules/otp/otp.validation.js
// ============================================================
import { z } from "zod";

/**
 * Request OTP (step 1)
 */
export const requestOTPValidationSchema = z.object({
  body: z.object({
    purpose: z.enum(["CHANGE_USERNAME", "CHANGE_PASSWORD"], {
      required_error: "Purpose is required",
      errorMap: () => ({
        message: "Purpose must be CHANGE_USERNAME or CHANGE_PASSWORD",
      }),
    }),
  }),
});

/**
 * Change username (step 2 — username flow)
 */
export const changeUsernameValidationSchema = z.object({
  body: z.object({
    otp: z
      .string({ required_error: "OTP is required" })
      .length(6, "OTP must be exactly 6 digits")
      .regex(/^\d{6}$/, "OTP must contain only digits"),

    newUsername: z
      .string({ required_error: "New username is required" })
      .min(3, "Username must be at least 3 characters")
      .max(20, "Username cannot exceed 20 characters")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers, and underscores"
      )
      .trim(),
  }),
});

/**
 * Change password (step 2 — password flow)
 */
export const changePasswordValidationSchema = z.object({
  body: z
    .object({
      otp: z
        .string({ required_error: "OTP is required" })
        .length(6, "OTP must be exactly 6 digits")
        .regex(/^\d{6}$/, "OTP must contain only digits"),

      newPassword: z
        .string({ required_error: "New password is required" })
        .min(8, "Password must be at least 8 characters")
        .max(50, "Password cannot exceed 50 characters")
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
          "Password must contain at least one uppercase letter, one lowercase letter, and one number"
        ),

      confirmPassword: z.string({
        required_error: "Please confirm your new password",
      }),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }),
});

export const otpValidation = {
  requestOTPValidationSchema,
  changeUsernameValidationSchema,
  changePasswordValidationSchema,
};