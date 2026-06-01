import express from "express";
import { attendanceControllers } from "./attendance.controller.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { attendanceValidation } from "./attendance.validation.js";
import auth from "../../middlewares/auth.js";
import { requirePermission } from "../../middlewares/permission.js";

const router = express.Router();

/**
 * Mark single attendance
 * POST /api/attendance
 * Access: TEACHER, ADMIN, PRINCIPAL, VICE_PRINCIPAL
 */

router.post(
  "/",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL", "VICE_PRINCIPAL", "TEACHER"),
  requirePermission("ATTENDANCE", "CREATE"),
  validateRequest(attendanceValidation.markAttendanceValidationSchema),
  attendanceControllers.markAttendance,
);

/**
 * Mark bulk attendance
 * POST /api/attendance/bulk
 * Access: TEACHER, ADMIN, PRINCIPAL, VICE_PRINCIPAL
 */
router.post(
  "/bulk",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL", "VICE_PRINCIPAL", "TEACHER"),
  requirePermission("ATTENDANCE", "CREATE"),
  validateRequest(attendanceValidation.bulkAttendanceValidationSchema),
  attendanceControllers.markBulkAttendance,
);

/**
 * Get today's summary
 * GET /api/attendance/today/summary
 * Access: ADMIN, PRINCIPAL, VICE_PRINCIPAL
 */
router.get(
  "/today/summary",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL", "VICE_PRINCIPAL"),
  requirePermission("ATTENDANCE", "VIEW"),
  attendanceControllers.getTodaySummary,
);

/**
 * Get attendance by section and date
 * GET /api/attendance?sectionId=&date=
 * Access: TEACHER, ADMIN, PRINCIPAL, VICE_PRINCIPAL
 */
router.get(
  "/",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL", "VICE_PRINCIPAL", "TEACHER"),
  requirePermission("ATTENDANCE", "VIEW"),
  attendanceControllers.getAttendanceBySectionAndDate,
);

/**
 * Get student attendance history
 * GET /api/attendance/student/:studentId
 * Access: TEACHER, ADMIN, PRINCIPAL, STUDENT (own), PARENT (child)
 */
router.get(
  "/student/:studentId",
  auth(
    "SUPER_ADMIN",
    "ADMIN",
    "PRINCIPAL",
    "VICE_PRINCIPAL",
    "TEACHER",
    "STUDENT",
    "PARENT",
  ),
  requirePermission("ATTENDANCE", "VIEW"),
  attendanceControllers.getStudentAttendanceHistory,
);

/**
 * Get section attendance report
 * GET /api/attendance/section/:sectionId/report
 * Access: TEACHER, ADMIN, PRINCIPAL, VICE_PRINCIPAL
 */
router.get(
  "/section/:sectionId/report",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL", "VICE_PRINCIPAL", "TEACHER"),
  requirePermission("ATTENDANCE", "VIEW"),
  attendanceControllers.getSectionAttendanceReport,
);

/**
 * Update attendance
 * PATCH /api/attendance/:id
 * Access: ADMIN, PRINCIPAL
 */
router.patch(
  "/:id",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  requirePermission("ATTENDANCE", "UPDATE"),
  validateRequest(attendanceValidation.updateAttendanceValidationSchema),
  attendanceControllers.updateAttendance,
);

export const attendanceRoutes = router;
