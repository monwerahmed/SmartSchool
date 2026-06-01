import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync.js";
import { studentServices } from "./student.service.js";
import sendResponse from "../../utils/sendResponse.js";

/**
 * Create student (User + Profile)
 */

const createStudent = catchAsync(async (req, res) => {
  const result = await studentServices.createStudentIntoDB(req.body, req.user);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Student created successfully",
    data: result,
  });
});


/**
 * Get all students
 */
const getAllStudents = catchAsync(async (req, res) => {
  const result = await studentServices.getAllStudentsFromDB(
    req.query,
    req.user,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Students retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

/**
 * get own student profile
 */
const getOwnProfile = catchAsync(async (req, res) => {
  const result = await studentServices.getOwnProfileFromDB(req.user.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile retrieved successfully",
    data: result,
  });
});

/**
 * Get single student
 */
const getStudentById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await studentServices.getStudentByIdFromDB(id, req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Student retrieved successfully",
    data: result,
  });
});

/**
 * Update student profile
 */
const updateStudent = catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await studentServices.updateStudentIntoDB(
    id,
    req.body,
    req.user,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Student updated successfully",
    data: result,
  });
});

/**
 * Change student status
 */
const changeStudentStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const result = await studentServices.changeStudentStatusIntoDB(
    id,
    status,
    req.user,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Student status changed to ${status} successfully`,
    data: result,
  });
});

/**
 * Enroll student in section
 */

const enrollStudent = catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await studentServices.enrollStudentIntoDB(
    id,
    req.body,
    req.user,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Student enrolled successfully",
    data: result,
  });
});

/**
 * Get student enrollments
 */
const getStudentEnrollments = catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await studentServices.getStudentEnrollmentsFromDB(
    id,
    req.user,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Student enrollments retrieved successfully",
    data: result,
  });
});

/**
 * Update enrollment status
 */
const updateEnrollmentStatus = catchAsync(async (req, res) => {
  const { enrollId } = req.params;
  const { status } = req.body;

  const result = await studentServices.updateEnrollmentStatusIntoDB(
    enrollId,
    status,
    req.user,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Enrollment status changed to ${status} successfully`,
    data: result,
  });
});

export const studentControllers = {
  createStudent,
  getOwnProfile,
  getAllStudents,
  getStudentById,
  updateStudent,
  changeStudentStatus,
  enrollStudent,
  getStudentEnrollments,
  updateEnrollmentStatus,
};
