import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { attendanceServices } from "./attendance.service.js";

/**
 * Mark single attendance
 */

const markAttendance = catchAsync(async (req, res) => {
  const result = await attendanceServices.markAttendanceIntoDB(
    req.body,
    req.user,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Attendance marked successfully",
    data: result,
  });
});

/**
 * Mark bulk attendance
 */
const markBulkAttendance = catchAsync(async (req, res) => {
  const result = await attendanceServices.markBulkAttendanceIntoDB(
    req.body,
    req.user,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Bulk attendance marked successfully",
    data: result,
  });
});

/**
 * Get attendance by section and date
 */
const getAttendanceBySectionAndDate = catchAsync(async (req, res) => {
  const { sectionId, date } = req.query;

  const result = await attendanceServices.getAttendanceBySectionAndDateFromDB(
    sectionId,
    date,
    req.user,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Attendance retrieved successfully",
    data: result,
  });
});

/**
 * Get student attendance history
 */
const getStudentAttendanceHistory = catchAsync(async (req, res) => {
  const { studentId } = req.params;

  const result = await attendanceServices.getStudentAttendanceHistoryFromDB(
    studentId,
    req.query,
    req.user,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Student attendance history retrieved successfully",
    data: result,
  });
});

/**
 * Get section attendance report
 */
const getSectionAttendanceReport = catchAsync(async (req, res) => {
  const { sectionId } = req.params;

  const result = await attendanceServices.getSectionAttendanceReportFromDB(
    sectionId,
    req.query,
    req.user,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Section attendance report retrieved successfully",
    data: result,
  });
});

/**
 * Update attendance
 */
const updateAttendance = catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await attendanceServices.updateAttendanceIntoDB(
    id,
    req.body,
    req.user,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Attendance updated successfully",
    data: result,
  });
});

/**
 * Get today's summary
 */
const getTodaySummary = catchAsync(async (req, res) => {
  const result = await attendanceServices.getTodaySummaryFromDB(req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Today's attendance summary retrieved successfully",
    data: result,
  });
});

export const attendanceControllers = {
  markAttendance,
  markBulkAttendance,
  getAttendanceBySectionAndDate,
  getStudentAttendanceHistory,
  getSectionAttendanceReport,
  updateAttendance,
  getTodaySummary,
};
