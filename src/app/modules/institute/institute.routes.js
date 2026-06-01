import express from "express";
import auth from "../../middlewares/auth.js";
import { requirePermission } from "../../middlewares/permission.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { institutionControllers } from "./institute.controller.js";
import { institutionValidation } from "./institute.validation.js";

const router = express.Router();
/**
 * Create institution
 * POST /api/institutions
 * Access: SUPER_ADMIN only
 */

router.post(
  "/",
  auth("SUPER_ADMIN"),
  requirePermission("INSTITUTION", "CREATE"),
  validateRequest(institutionValidation.createInstitutionValidationSchema),
  institutionControllers.createInstitution,
);

/**
 * Get all institutions
 * GET /api/institutions?search=abc&status=ACTIVE&page=1&limit=10
 * Access: SUPER_ADMIN only
 */
router.get(
  "/",
  auth("SUPER_ADMIN"),
  requirePermission("INSTITUTION", "VIEW"),
  institutionControllers.getAllInstitutions,
);

/**
 * Get single institution
 * GET /api/institutions/:id
 * Access: Any authenticated user (with permission check in service)
 */
router.get(
  "/:id",
  auth("SUPER_ADMIN"),
  requirePermission("INSTITUTION", "VIEW"),
  institutionControllers.getInstitutionById,
);

/**
 * Update institution
 * PATCH /api/institutions/:id
 * Access: SUPER_ADMIN or institution's own ADMIN/PRINCIPAL
 */
router.patch(
  "/:id",
  auth("SUPER_ADMIN"),
  requirePermission("INSTITUTION", "UPDATE"),
  validateRequest(institutionValidation.updateInstitutionValidationSchema),
  institutionControllers.updateInstitution,
);

/**
 * Change institution status
 * PATCH /api/institutions/:id/status
 * Access: SUPER_ADMIN only
 */
router.patch(
  "/:id/status",
  auth("SUPER_ADMIN"),
  requirePermission("INSTITUTION", "MANAGE"),
  validateRequest(institutionValidation.changeStatusValidationSchema),
  institutionControllers.changeInstitutionStatus,
);

/**
 * Get institution statistics
 * GET /api/institutions/:id/stats
 * Access: Any authenticated user (with permission check in service)
 */
router.get(
  "/:id/stats",
  auth("SUPER_ADMIN"),
  requirePermission("INSTITUTION", "VIEW"),
  institutionControllers.getInstitutionStats,
);

export const instituteRoute = router;
