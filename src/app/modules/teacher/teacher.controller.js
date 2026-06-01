import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { teacherServices } from "./teacher.service.js";

/**
 * Create teacher (User + Profile)
 */

const createTeacher = catchAsync(async (req, res) => {
  const result = await teacherServices.createTeacherIntoDB(req.body, req.user);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Teacher created successfully",
    data: result,
  });
});

/**
 * Get all teachers
 */

const getAllTeachers = catchAsync(async (req, res) => {
  const result = await teacherServices.getAllTeachersFromDB(
    req.query,
    req.user,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Teachers retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

/**
 * Get single teacher
 */
const getTeacherById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await teacherServices.getTeacherByIdFromDB(id, req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Teacher retrieved successfully",
    data: result,
  });
});

/**
 * Get own profile (Teacher views self)
 */
const getOwnProfile = catchAsync(async (req, res) => {
  const result = await teacherServices.getOwnProfileFromDB(req.user.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile retrieved successfully",
    data: result,
  });
});

/**
 * Update teacher profile
 */
const updateTeacher = catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await teacherServices.updateTeacherIntoDB(
    id,
    req.body,
    req.user,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Teacher updated successfully",
    data: result,
  });
});

/**
 * Change teacher status
 */
const changeTeacherStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const result = await teacherServices.changeTeacherStatusIntoDB(
    id,
    status,
    req.user,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Teacher status changed to ${status} successfully`,
    data: result,
  });
});

/**
 * Get teacher's assigned subjects
 */
const getTeacherSubjects = catchAsync(async (req, res) => {
  const { teacherId } = req.params;
  const result = await teacherServices.getTeacherSubjects(teacherId, req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Teacher subjects retrieved successfully",
    data: result,
  });
});

export const teacherControllers = {
  createTeacher,
  getAllTeachers,
  getTeacherById,
  getOwnProfile,
  updateTeacher,
  changeTeacherStatus,
  getTeacherSubjects,
};
