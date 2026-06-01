// ============================================================
// src/modules/otp/otp.controller.js
// ============================================================
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import httpStatus from "http-status";
import { otpServices } from "./otp.service.js";

/**
 * Step 1 — Request OTP
 * POST /api/auth/otp/request
 * Body: { purpose: "CHANGE_USERNAME" | "CHANGE_PASSWORD" }
 */
const requestOTP = catchAsync(async (req, res) => {
    //console.log("Working properly");
  const result = await otpServices.requestOTPService(
    req.user.userId,
    req.body.purpose
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: {
      sentTo: result.sentTo,
      expiresAt: result.expiresAt,
      warnings: result.warnings,
    },
  });
});

/**
 * Step 2a — Change username
 * POST /api/auth/otp/change-username
 * Body: { otp, newUsername }
 */
const changeUsername = catchAsync(async (req, res) => {
  const result = await otpServices.changeUsernameService(
    req.user.userId,
    req.body
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: result.user,
  });
});

/**
 * Step 2b — Change password
 * POST /api/auth/otp/change-password
 * Body: { otp, newPassword, confirmPassword }
 */
const changePassword = catchAsync(async (req, res) => {
  const result = await otpServices.changePasswordService(
    req.user.userId,
    req.body
  );

  // Clear auth cookies after password change — force re-login
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

export const otpControllers = {
  requestOTP,
  changeUsername,
  changePassword,
};