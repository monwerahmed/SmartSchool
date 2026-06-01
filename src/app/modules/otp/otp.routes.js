// ============================================================
// src/modules/otp/otp.routes.js
// ============================================================
import express from "express";
import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { otpControllers } from "./otp.controller.js";
import { otpValidation } from "./otp.validation.js";

const router = express.Router();

/**
 * Step 1 — Request OTP
 * POST /api/auth/otp/request
 *
 * Any logged-in user can request an OTP for themselves.
 * No specific role needed — just must be authenticated.
 */
router.post(
  "/request",
  auth(
    "SUPER_ADMIN",
    "ADMIN",
    "PRINCIPAL",
    "VICE_PRINCIPAL",
    "TEACHER",
    "STUDENT",
    "PARENT",
    "ACCOUNTANT",
    "LIBRARIAN"
  ),
  validateRequest(otpValidation.requestOTPValidationSchema),
  otpControllers.requestOTP
);

/**
 * Step 2a — Verify OTP + change username
 * POST /api/auth/otp/change-username
 */
router.post(
  "/change-username",
  auth(
    "SUPER_ADMIN",
    "ADMIN",
    "PRINCIPAL",
    "VICE_PRINCIPAL",
    "TEACHER",
    "STUDENT",
    "PARENT",
    "ACCOUNTANT",
    "LIBRARIAN"
  ),
  validateRequest(otpValidation.changeUsernameValidationSchema),
  otpControllers.changeUsername
);

/**
 * Step 2b — Verify OTP + change password
 * POST /api/auth/otp/change-password
 */
router.post(
  "/change-password",
  auth(
    "SUPER_ADMIN",
    "ADMIN",
    "PRINCIPAL",
    "VICE_PRINCIPAL",
    "TEACHER",
    "STUDENT",
    "PARENT",
    "ACCOUNTANT",
    "LIBRARIAN"
  ),
  validateRequest(otpValidation.changePasswordValidationSchema),
  otpControllers.changePassword
);

export const otpRoutes = router;