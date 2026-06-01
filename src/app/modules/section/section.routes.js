import express from "express";
import auth from "../../middlewares/auth.js";
import { requirePermission } from "../../middlewares/permission.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { sectionControllers } from "./section.controller.js";
import { sectionValidation } from "./section.validation.js";

const router = express.Router();

/**
 * Create section
 * POST /api/sections
 * Access: ADMIN, PRINCIPAL
 */
router.post(
  "/",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  requirePermission("SECTION", "CREATE"),
  validateRequest(sectionValidation.createSectionValidationSchema),
  sectionControllers.createSection,
);

/**
 * Get all sections
 * GET /api/sections?classId=&shift=&page=&limit=
 * Access: ADMIN, PRINCIPAL, VICE_PRINCIPAL, TEACHER
 */
router.get(
  "/",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL", "VICE_PRINCIPAL", "TEACHER"),
  requirePermission("SECTION", "VIEW"),
  sectionControllers.getAllSections,
);

/**
 * Get single section
 * GET /api/sections/:id
 * Access: ADMIN, PRINCIPAL, VICE_PRINCIPAL, TEACHER
 */

router.get(
  "/:id",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL", "VICE_PRINCIPAL", "TEACHER"),
  requirePermission("SECTION", "VIEW"),
  sectionControllers.getSectionById,
);

/**
 * Update section
 * PATCH /api/sections/:id
 * Access: ADMIN, PRINCIPAL
 */
router.patch(
  "/:id",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  requirePermission("SECTION", "UPDATE"),
  validateRequest(sectionValidation.updateSectionValidationSchema),
  sectionControllers.updateSection,
);

/**
 * Delete section
 * DELETE /api/sections/:id
 * Access: ADMIN only
 */
router.delete(
  "/:id",
  auth("SUPER_ADMIN", "ADMIN"),
  requirePermission("SECTION", "DELETE"),
  sectionControllers.deleteSection,
);

export const sectionRoutes = router;
