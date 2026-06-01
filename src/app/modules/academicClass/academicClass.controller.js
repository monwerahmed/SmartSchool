import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { academicClassServices } from "./academicClass.service.js";
/**
 * Create academic class
 * Route: POST /api/academic-classes
 * Access: ADMIN
 */

const createAcademicClass = catchAsync(async (req, res) => {
  const result = await academicClassServices.createAcademicClassIntoDB(
    req.body,
    req.user,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Academic class created successfully",
    data: result,
  });
});

/**
 * Get all academic classes
 * Route: GET /api/academic-classes
 * Access: ADMIN, PRINCIPAL, VICE_PRINCIPAL, TEACHER
 */

const getAllAcademicClasses = catchAsync(async (req, res) => {
  const result = await academicClassServices.getAllAcademicClassesFromDB(
    req.user,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Academic classes retrieved successfully",
    data: result,
  });
});

/**
 * Get single academic class
 * Route: GET /api/academic-classes/:id
 * Access: ADMIN, PRINCIPAL, VICE_PRINCIPAL, TEACHER
 */

const getSingleAcademicClass = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await academicClassServices.getSingleAcademicClassFromDB(
    id,
    req.user,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Academic class retrieved successfully",
    data: result,
  });
});

/**
 * Update academic class
 * Route: PATCH /api/academic-classes/:id
 * Access: ADMIN
 */
const updateAcademicClass = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await academicClassServices.updateAcademicClassIntoDB(
    id,
    req.body,
    req.user,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Academic class updated successfully",
    data: result,
  });
});

/**
 * Delete academic class
 * Route: DELETE /api/academic-classes/:id
 * Access: ADMIN
 */

const deleteAcademicClass = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await academicClassServices.deleteAcademicClassFromDB(
    id,
    req.user,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

/**
 * Assign subjects to class
 */
const assignSubjectsToClass = catchAsync(async (req, res) => {
  const { classId } = req.params;
  const result = await academicClassServices.assignSubjectsToClass(
    classId,
    req.body,
    req.user,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Subjects assigned to class successfully",
    data: result,
  });
});

/**
 * Get class subjects
 */
const getClassSubjects = catchAsync(async (req, res) => {
  const { classId } = req.params;
  const result = await academicClassServices.getClassSubjects(
    classId,
    req.user,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Class subjects retrieved successfully",
    data: result,
  });
});

/**
 * Update class-subject
 */
const updateClassSubject = catchAsync(async (req, res) => {
  const { classSubjectId } = req.params;
  const result = await academicClassServices.updateClassSubject(
    classSubjectId,
    req.body,
    req.user,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Class-subject updated successfully",
    data: result,
  });
});

/**
 * Remove subject from class
 */
const removeClassSubject = catchAsync(async (req, res) => {
  const { classSubjectId } = req.params;
  const result = await academicClassServices.removeClassSubject(
    classSubjectId,
    req.user,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

/**
 * Assign teacher to class-subject
 */
const assignTeacherToClassSubject = catchAsync(async (req, res) => {
  const { classSubjectId } = req.params;
  const { teacherId } = req.body;

  const result = await academicClassServices.assignTeacherToClassSubject(
    classSubjectId,
    teacherId,
    req.user,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

/**
 * Remove teacher from class-subject
 */
const removeTeacherFromClassSubject = catchAsync(async (req, res) => {
  const { classSubjectId } = req.params;

  const result = await academicClassServices.removeTeacherFromClassSubject(
    classSubjectId,
    req.user,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

export const academicClassControllers = {
  createAcademicClass,
  getAllAcademicClasses,
  getSingleAcademicClass,
  updateAcademicClass,
  deleteAcademicClass,

  assignSubjectsToClass,
  getClassSubjects,
  updateClassSubject,
  removeClassSubject,

  assignTeacherToClassSubject,
  removeTeacherFromClassSubject,
};
