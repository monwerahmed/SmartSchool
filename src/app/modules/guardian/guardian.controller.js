import sendResponse from "../../utils/sendResponse.js";
import catchAsync from "../../utils/catchAsync.js";
import httpStatus from "http-status";
import { guardianServices } from "./guardian.service.js";

/**
 * Create guardian (User + Profile)
 */

const createGuardian = catchAsync(async (req, res) => {
  const result = await guardianServices.createGuardianIntoDB(
    req.body,
    req.user,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Guardian created successfully",
    data: result,
  });
});

/**
 * Get all guardians
 */
const getAllGuardians = catchAsync(async (req, res) => {
  const result = await guardianServices.getAllGuardiansFromDB(
    req.query,
    req.user,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Guardians retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

/**
 * Get single guardian
 */
const getGuardianById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await guardianServices.getGuardianByIdFromDB(id, req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Guardian retrieved successfully",
    data: result,
  });
});

/**
 * Get own profile (Parent views self)
 */
const getOwnProfile = catchAsync(async (req, res) => {
  const result = await guardianServices.getOwnProfileFromDB(req.user.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile retrieved successfully",
    data: result,
  });
});

/**
 * Update guardian profile
 */
const updateGuardian = catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await guardianServices.updateGuardianIntoDB(
    id,
    req.body,
    req.user,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Guardian updated successfully",
    data: result,
  });
});

/**
 * Change guardian status
 */
const changeGuardianStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const result = await guardianServices.changeGuardianStatusIntoDB(
    id,
    status,
    req.user,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Guardian status changed to ${status} successfully`,
    data: result,
  });
});

/**
 * Link guardian to student
 */
const linkGuardianToStudent = catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await guardianServices.linkGuardianToStudentIntoDB(
    id,
    req.body,
    req.user,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Guardian linked to student successfully",
    data: result,
  });
});

/**
 * Get guardian's students
 */
const getGuardianStudents = catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await guardianServices.getGuardianStudentsFromDB(id, req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Guardian's students retrieved successfully",
    data: result,
  });
});

/**
 * Update guardian-student link
 */
const updateGuardianStudentLink = catchAsync(async (req, res) => {
  const { guardianId, studentId } = req.params;

  const result = await guardianServices.updateGuardianStudentLinkIntoDB(
    guardianId,
    studentId,
    req.body,
    req.user,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Guardian-student link updated successfully",
    data: result,
  });
});

/**
 * Unlink guardian from student
 */
const unlinkGuardianFromStudent = catchAsync(async (req, res) => {
  const { guardianId, studentId } = req.params;

  const result = await guardianServices.unlinkGuardianFromStudentIntoDB(
    guardianId,
    studentId,
    req.user,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Guardian unlinked from student successfully",
    data: result,
  });
});

export const guardianControllers = {
  createGuardian,
  getAllGuardians,
  getGuardianById,
  getOwnProfile,
  updateGuardian,
  changeGuardianStatus,
  linkGuardianToStudent,
  getGuardianStudents,
  updateGuardianStudentLink,
  unlinkGuardianFromStudent,
};
