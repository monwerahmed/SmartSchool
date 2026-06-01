import express from "express";
import auth from "../../middlewares/auth.js";
import { requirePermission } from "../../middlewares/permission.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { academicClassControllers } from "./academicClass.controller.js";
import { academicClassValidation } from "./academicClass.validation.js";
const router = express.Router();

/**
 * Create academic class
 */
router.post(
  "/",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  requirePermission("ACADEMIC_CLASS", "CREATE"),
  validateRequest(academicClassValidation.createAcademicClassValidationSchema),
  academicClassControllers.createAcademicClass,
);

/**
 * Get all academic classes
 */
router.get(
  "/",
  auth(
    "SUPER_ADMIN",
    "ADMIN",
    "PRINCIPAL",
    "VICE_PRINCIPAL",
    "TEACHER",
    "STUDENT",
    "PARENT",
  ),
  requirePermission("ACADEMIC_CLASS", "VIEW"),
  academicClassControllers.getAllAcademicClasses,
);

/**
 * Get single academic class
 */
router.get(
  "/:id",
  auth(
    "SUPER_ADMIN",
    "ADMIN",
    "PRINCIPAL",
    "VICE_PRINCIPAL",
    "TEACHER",
    "STUDENT",
    "PARENT",
  ),
  requirePermission("ACADEMIC_CLASS", "VIEW"),
  academicClassControllers.getSingleAcademicClass,
);

/**
 * Update academic class
 */
router.patch(
  "/:id",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  requirePermission("ACADEMIC_CLASS", "UPDATE"),
  validateRequest(academicClassValidation.updateAcademicClassValidationSchema),
  academicClassControllers.updateAcademicClass,
);

/**
 * Delete academic class
 */
router.delete(
  "/:id",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  requirePermission("ACADEMIC_CLASS", "DELETE"),
  academicClassControllers.deleteAcademicClass,
);

/**
 * Assign subjects to class (bulk)
 * POST /api/academic-classes/:classId/subjects
 */

router.post(
  "/:classId/subjects",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  requirePermission("ACADEMIC_CLASS", "MANAGE"),
  validateRequest(academicClassValidation.assignSubjectsValidationSchema),
  academicClassControllers.assignSubjectsToClass,
);

/**
 * Get all subjects in a class
 * GET /api/academic-classes/:classId/subjects
 */

router.get(
  "/:classId/subjects",
  auth(
    "SUPER_ADMIN",
    "ADMIN",
    "PRINCIPAL",
    "VICE_PRINCIPAL",
    "TEACHER",
    "STUDENT",
    "PARENT",
  ),
  requirePermission("ACADEMIC_CLASS", "VIEW"),
  academicClassControllers.getClassSubjects,
);

/**
 * Update class-subject configuration
 * PATCH /api/academic-classes/subjects/:classSubjectId
 */

router.patch(
  "/subjects/:classSubjectId",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  requirePermission("ACADEMIC_CLASS", "MANAGE"),
  validateRequest(academicClassValidation.updateClassSubjectValidationSchema),
  academicClassControllers.updateClassSubject,
);

/**
 * Remove subject from class
 * DELETE /api/academic-classes/subjects/:classSubjectId
 */

router.delete(
  "/subjects/:classSubjectId",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  requirePermission("ACADEMIC_CLASS", "MANAGE"),
  academicClassControllers.removeClassSubject,
);

/**
 * Assign teacher to class-subject
 * POST /api/academic-classes/subjects/:classSubjectId/assign-teacher
 */
router.post(
  "/subjects/:classSubjectId/assign-teacher",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  requirePermission("ACADEMIC_CLASS", "MANAGE"),
  validateRequest(academicClassValidation.assignTeacherValidationSchema),
  academicClassControllers.assignTeacherToClassSubject,
);

/**
 * Remove teacher from class-subject
 * DELETE /api/academic-classes/subjects/:classSubjectId/remove-teacher
 */
router.delete(
  "/subjects/:classSubjectId/remove-teacher",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  requirePermission("ACADEMIC_CLASS", "MANAGE"),
  academicClassControllers.removeTeacherFromClassSubject,
);

export const academicClassRoutes = router;
