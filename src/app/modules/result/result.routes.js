import express from "express";
import { resultControllers } from "./result.controller.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { resultValidation } from "./result.validation.js";
import auth from "../../middlewares/auth.js";
import { requirePermission } from "../../middlewares/permission.js";
const router = express.Router();

// ========================================
// SUBJECT ROUTES
// ========================================

/**
 * Create subject
 * POST /api/results/subjects
 */
router.post(
  "/subjects",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  requirePermission("SUBJECT", "CREATE"),
  validateRequest(resultValidation.createSubjectValidationSchema),
  resultControllers.createSubject,
);

/**
 * Get all subjects
 * GET /api/results/subjects
 */
router.get(
  "/subjects",
  auth(
    "SUPER_ADMIN",
    "ADMIN",
    "PRINCIPAL",
    "VICE_PRINCIPAL",
    "TEACHER",
    "STUDENT",
    "PARENT",
  ),
  requirePermission("SUBJECT", "VIEW"),
  resultControllers.getAllSubjects,
);

/**
 * Get single subject
 * GET /api/results/subjects/:id
 */
router.get(
  "/subjects/:id",
  auth(
    "SUPER_ADMIN",
    "ADMIN",
    "PRINCIPAL",
    "VICE_PRINCIPAL",
    "TEACHER",
    "STUDENT",
    "PARENT",
  ),
  requirePermission("SUBJECT", "VIEW"),
  resultControllers.getSingleSubject,
);

// ========================================
// EXAM ROUTES
// ========================================

/**
 * Create exam
 * POST /api/results/exams
 */
router.post(
  "/exams",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  requirePermission("EXAM", "CREATE"),
  validateRequest(resultValidation.createExamValidationSchema),
  resultControllers.createExam,
);

/**
 * Delete single exam
 */
router.delete(
  "/exams/delete/:id",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  requirePermission("EXAM", "DELETE"),
  resultControllers.deleteSingleExam,
);

/**
 * Update exam
 */
router.patch(
  "/exams/update/:id",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  requirePermission("EXAM", "UPDATE"),
  validateRequest(resultValidation.updateExamValidationSchema),
  resultControllers.updateExam,
);

/**
 * Get all exams
 * GET /api/results/exams?sectionId=xxx&academicYear=2025
 */
router.get(
  "/exams",
  auth(
    "SUPER_ADMIN",
    "ADMIN",
    "PRINCIPAL",
    "VICE_PRINCIPAL",
    "TEACHER",
    "STUDENT",
    "PARENT",
  ),
  requirePermission("EXAM", "VIEW"),
  resultControllers.getAllExams,
);

/**
 * Get single exam
 * GET /api/results/exams/:id
 */
router.get(
  "/exams/:id",
  auth(
    "SUPER_ADMIN",
    "ADMIN",
    "PRINCIPAL",
    "VICE_PRINCIPAL",
    "TEACHER",
    "STUDENT",
    "PARENT",
  ),
  requirePermission("EXAM", "VIEW"),
  resultControllers.getSingleExam,
);

// ========================================
// RESULT ROUTES
// ========================================

/**
 * Enter single result
 * POST /api/results
 */
router.post(
  "/",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL", "TEACHER"),
  requirePermission("RESULT", "CREATE"),
  validateRequest(resultValidation.enterResultValidationSchema),
  resultControllers.enterResult,
);

/**
 * Bulk result entry
 * POST /api/results/bulk
 */
router.post(
  "/bulk",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL", "TEACHER"),
  requirePermission("RESULT", "CREATE"),
  validateRequest(resultValidation.bulkResultValidationSchema),
  resultControllers.bulkResultEntry,
);

/**
 * Get all results
 * GET /api/results?examId=xxx&studentId=xxx&sectionId=xxx
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
  requirePermission("RESULT", "VIEW"),
  resultControllers.getAllResults,
);

/**
 * Get single result
 * GET /api/results/:id
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
  requirePermission("RESULT", "VIEW"),
  resultControllers.getSingleResult,
);

/**
 * Get student report card
 * GET /api/results/student/:studentId/exam/:examId
 */
router.get(
  "/student/:studentId/exam/:examId",
  auth(
    "SUPER_ADMIN",
    "ADMIN",
    "PRINCIPAL",
    "VICE_PRINCIPAL",
    "TEACHER",
    "STUDENT",
    "PARENT",
  ),
  requirePermission("RESULT", "VIEW"),
  resultControllers.getStudentReportCard,
);

/**
 * Get section summary with ranking
 * GET /api/results/section/:sectionId/exam/:examId
 */
router.get(
  "/section/:sectionId/exam/:examId",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL", "VICE_PRINCIPAL", "TEACHER"),
  requirePermission("RESULT", "VIEW"),
  resultControllers.getSectionSummary,
);

/**
 * Get subject-wise analysis
 * GET /api/results/exam/:examId/subject/:subjectId/analysis
 */
router.get(
  "/exam/:examId/subject/:subjectId/analysis",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL", "VICE_PRINCIPAL", "TEACHER"),
  requirePermission("RESULT", "VIEW"),
  resultControllers.getSubjectAnalysis,
);

/**
 * Update result
 * PATCH /api/results/:id
 */
router.patch(
  "/:id",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL", "TEACHER"),
  requirePermission("RESULT", "UPDATE"),
  validateRequest(resultValidation.updateResultValidationSchema),
  resultControllers.updateResult,
);

export const resultRoutes = router;
