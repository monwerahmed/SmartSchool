import express from "express";
import auth from "../../middlewares/auth.js";
import { requirePermission } from "../../middlewares/permission.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { studentValidation } from "./student.validation.js";
import { studentControllers } from "./student.controller.js";


const router = express.Router();

/**
 * Create student
 * POST /api/students
 * Access: ADMIN, PRINCIPAL
 */

router.post(
  "/",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  requirePermission("STUDENT", "CREATE"),
  validateRequest(studentValidation.createStudentValidationSchema),
  studentControllers.createStudent
);

/**
 * Get all students
 * GET /api/students?search=&gender=&bloodGroup=&page=&limit=
 * Access: ADMIN, PRINCIPAL, VICE_PRINCIPAL, TEACHER
 */
router.get(
  "/",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL", "VICE_PRINCIPAL", "TEACHER"),
  requirePermission("STUDENT", "VIEW"),
  studentControllers.getAllStudents
);


router.get("/me", auth("STUDENT"), studentControllers.getOwnProfile);



/**
 * Get single student
 * GET /api/students/:id
 * Access: ADMIN, PRINCIPAL, VICE_PRINCIPAL, TEACHER, own STUDENT
 */
router.get(
  "/:id",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL", "VICE_PRINCIPAL", "TEACHER", "STUDENT"),
  requirePermission("STUDENT", "VIEW"),
  studentControllers.getStudentById
);

/**
 * Update student profile
 * PATCH /api/students/:id
 * Access: ADMIN, PRINCIPAL
 */
router.patch(
  "/:id",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  requirePermission("STUDENT", "UPDATE"),
  validateRequest(studentValidation.updateStudentValidationSchema),
  studentControllers.updateStudent
);

/**
 * Change student status
 * PATCH /api/students/:id/status
 * Access: ADMIN only
 */
router.patch(
  "/:id/status",
  auth("SUPER_ADMIN", "ADMIN"),
  requirePermission("STUDENT", "MANAGE"),
  validateRequest(studentValidation.changeStatusValidationSchema),
  studentControllers.changeStudentStatus
);

/**
 * Enroll student in section
 * POST /api/students/:id/enroll
 * Access: ADMIN, PRINCIPAL
 */

router.post(
  "/:id/enroll",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  requirePermission("ENROLLMENT", "CREATE"),
  validateRequest(studentValidation.enrollStudentValidationSchema),
  studentControllers.enrollStudent
);

/**
 * Get student enrollments
 * GET /api/students/:id/enrollments
 * Access: ADMIN, PRINCIPAL, TEACHER, own STUDENT
 */
router.get(
  "/:id/enrollments",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL", "VICE_PRINCIPAL", "TEACHER", "STUDENT"),
  requirePermission("ENROLLMENT", "VIEW"),
  studentControllers.getStudentEnrollments
);


/**
 * Update enrollment status
 * PATCH /api/students/enrollments/:enrollId
 * Access: ADMIN, PRINCIPAL
 */
router.patch(
  "/enrollments/:enrollId",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  requirePermission("ENROLLMENT", "UPDATE"),
  validateRequest(studentValidation.updateEnrollmentStatusValidationSchema),
  studentControllers.updateEnrollmentStatus
);


export const studentRoutes = router;
