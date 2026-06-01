import catchAsync from "../../utils/catchAsync.js";
import { getCookieOptions } from "../../utils/cookie.js";
import sendResponse from "../../utils/sendResponse.js";
import { authService } from "./auth.service.js";
import httpStatus from "http-status";

const loginUser = catchAsync(async (req, res) => {
  const result = await authService.loginUserFromDB(req.body);
  const { accessToken, refreshToken, user } = result;

  // Set both tokens in cookies
  res.cookie("accessToken", accessToken, getCookieOptions());
  res.cookie("refreshToken", refreshToken, {
    ...getCookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days for refresh token
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Login successful! Welcome back.",
    data: {
      user,
      accessToken, // Also send in response body for frontend
    },
  });
});


const logoutUser = catchAsync(async (req, res) => {
  await authService.logoutUserFromDB();

  // Clear both tokens from cookies
  res.clearCookie("accessToken", getCookieOptions());
  res.clearCookie("refreshToken", getCookieOptions());

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Logout Successful!",
    data: null,
  });
});

export const authController = {
  loginUser,
  logoutUser,
};
