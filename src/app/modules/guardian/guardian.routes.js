import express from "express";
import auth from "../../middlewares/auth.js";
import { requirePermission } from "../../middlewares/permission.js";
import { guardianValidation } from "./guardian.validation.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { guardianControllers } from "./guardian.controller.js";

const router = express.Router();

/**
 * Create guardian
 * POST /api/guardians
 * Access: ADMIN, PRINCIPAL
 */

router.post(
  "/",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  requirePermission("GUARDIAN", "CREATE"),
  validateRequest(guardianValidation.createGuardianValidationSchema),
  guardianControllers.createGuardian,
);

/**
 * Get own profile
 * GET /api/guardians/me
 * Access: PARENT (own profile)
 */
router.get("/me", auth("GUARDIAN"), guardianControllers.getOwnProfile);

/**
 * Get all guardians
 * GET /api/guardians?search=&occupation=&page=&limit=
 * Access: ADMIN, PRINCIPAL, VICE_PRINCIPAL, TEACHER
 */
router.get(
  "/",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL", "VICE_PRINCIPAL", "TEACHER"),
  requirePermission("GUARDIAN", "VIEW"),
  guardianControllers.getAllGuardians,
);

/**
 * Get single guardian
 * GET /api/guardians/:id
 * Access: ADMIN, PRINCIPAL, VICE_PRINCIPAL, TEACHER
 */
router.get(
  "/:id",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL", "VICE_PRINCIPAL", "TEACHER"),
  requirePermission("GUARDIAN", "VIEW"),
  guardianControllers.getGuardianById,
);

/**
 * Update guardian profile
 * PATCH /api/guardians/:id
 * Access: ADMIN, PRINCIPAL
 */
router.patch(
  "/:id",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  requirePermission("GUARDIAN", "UPDATE"),
  validateRequest(guardianValidation.updateGuardianValidationSchema),
  guardianControllers.updateGuardian,
);

/**
 * Change guardian status
 * PATCH /api/guardians/:id/status
 * Access: ADMIN only
 */
router.patch(
  "/:id/status",
  auth("SUPER_ADMIN", "ADMIN"),
  requirePermission("GUARDIAN", "MANAGE"),
  validateRequest(guardianValidation.changeStatusValidationSchema),
  guardianControllers.changeGuardianStatus,
);

/**
 * Link guardian to student
 * POST /api/guardians/:id/link-student
 * Access: ADMIN, PRINCIPAL
 */
router.post(
  "/:id/link-student",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  requirePermission("GUARDIAN", "UPDATE"),
  validateRequest(guardianValidation.linkStudentValidationSchema),
  guardianControllers.linkGuardianToStudent,
);

/**
 * Get guardian's students
 * GET /api/guardians/:id/students
 * Access: ADMIN, PRINCIPAL, TEACHER
 */
router.get(
  "/:id/students",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL", "VICE_PRINCIPAL", "TEACHER"),
  requirePermission("GUARDIAN", "VIEW"),
  guardianControllers.getGuardianStudents,
);

/**
 * Update guardian-student link
 * PATCH /api/guardians/:guardianId/students/:studentId
 * Access: ADMIN, PRINCIPAL
 */
router.patch(
  "/:guardianId/students/:studentId",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  requirePermission("GUARDIAN", "UPDATE"),
  validateRequest(guardianValidation.updateLinkValidationSchema),
  guardianControllers.updateGuardianStudentLink,
);


/**
 * Unlink guardian from student
 * DELETE /api/guardians/:guardianId/students/:studentId
 * Access: ADMIN, PRINCIPAL
 */
router.delete(
  "/:guardianId/students/:studentId",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  requirePermission("GUARDIAN", "DELETE"),
  guardianControllers.unlinkGuardianFromStudent
);

export const guardianRoutes = router;
