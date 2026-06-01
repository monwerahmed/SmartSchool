import express from "express";
import auth from "../../middlewares/auth.js";
import { requirePermission } from "../../middlewares/permission.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { teacherValidation } from "./teacher.validation.js";
import { teacherControllers } from "./teacher.controller.js";

const router = express.Router();

/**
 * Create teacher
 * POST /api/teachers
 * Access: ADMIN, PRINCIPAL
 */

router.post(
  "/",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  requirePermission("TEACHER", "CREATE"),
  validateRequest(teacherValidation.createTeacherValidationSchema),
  teacherControllers.createTeacher,
);

/**
 * Get own profile
 * GET /api/teachers/me
 * Access: TEACHER (own profile)
 */
router.get("/me", auth("TEACHER"), teacherControllers.getOwnProfile);

/**
 * Get all teachers
 * GET /api/teachers?search=&department=&designation=&page=&limit=
 * Access: ADMIN, PRINCIPAL, VICE_PRINCIPAL
 */

router.get(
  "/",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL", "VICE_PRINCIPAL"),
  requirePermission("TEACHER", "VIEW"),
  teacherControllers.getAllTeachers,
);

/**
 * Get single teacher
 * GET /api/teachers/:id
 * Access: ADMIN, PRINCIPAL, VICE_PRINCIPAL
 */
router.get(
  "/:id",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL", "VICE_PRINCIPAL"),
  requirePermission("TEACHER", "VIEW"),
  teacherControllers.getTeacherById,
);

/**
 * Update teacher profile
 * PATCH /api/teachers/:id
 * Access: ADMIN, PRINCIPAL
 */
router.patch(
  "/:id",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  requirePermission("TEACHER", "UPDATE"),
  validateRequest(teacherValidation.updateTeacherValidationSchema),
  teacherControllers.updateTeacher,
);

/**
 * Change teacher status
 * PATCH /api/teachers/:id/status
 * Access: ADMIN only
 */
router.patch(
  "/:id/status",
  auth("SUPER_ADMIN", "ADMIN"),
  requirePermission("TEACHER", "MANAGE"),
  validateRequest(teacherValidation.changeStatusValidationSchema),
  teacherControllers.changeTeacherStatus,
);

/**
 * Get teacher's assigned subjects
 * GET /api/teachers/:teacherId/subjects
 */
router.get(
  "/:teacherId/subjects",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL", "VICE_PRINCIPAL", "TEACHER"),
  requirePermission("TEACHER", "VIEW"),
  teacherControllers.getTeacherSubjects,
);

export const teacherRoutes = router;
