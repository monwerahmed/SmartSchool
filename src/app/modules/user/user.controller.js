import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { userServices } from "./user.service.js";


/**
 * Creating user controller
 */
const createUserController = catchAsync(async (req, res) => {
  const result = await userServices.createUserIntoDB(req.body);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "User Created Successfully",
    data: result,
  })
})

/**
 * Get all user info controller
 */
const getAllUsersController = catchAsync(async (req, res) => {
  const result = await userServices.getAllUsersFromDB();

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Users fetched successfully",
    data: result,
  });
});

/**
 * Creating admin controller 
 */
const createSuperAdminController = catchAsync(async (req, res) => {
  const result = await userServices.createSuperAdminIntoDB(req.body);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Admin Created Successfully",
    data: result,
  });
});

/**
 * Create Admin controller
 * Route: POST /api/users/create-admin
 * Access: SUPER_ADMIN only
 */
const createAdminController = catchAsync(async (req, res) => {
  const result = await userServices.createAdminIntoDB(req.body);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Admin created successfully",
    data: result,
  });
});

/**
 * Create Principal controller
 * Route: POST /api/users/create-principal
 * Access: SUPER_ADMIN or ADMIN
 */
const createPrincipalController = catchAsync(async (req, res) => {
  const requestingUserId = req.user.userId;

  const result = await userServices.createPrincipalIntoDB(
    req.body,
    requestingUserId,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Principal created successfully",
    data: result,
  });
});

export const userControllers = {
  createSuperAdminController,
  createAdminController,
  createPrincipalController,
  createUserController,
  getAllUsersController,
};
