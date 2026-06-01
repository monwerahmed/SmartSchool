import express from "express";
import auth from "../../middlewares/auth.js";
import { requirePermission } from "../../middlewares/permission.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { libraryControllers } from "./library.controller.js";
import { libraryValidation } from "./library.validation.js";

const router = express.Router();

// ============================================================
// STATS
// GET /api/library/stats
// ============================================================
router.get(
  "/stats",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL", "LIBRARIAN"),
  requirePermission("LIBRARY", "VIEW"),
  libraryControllers.getLibraryStats
);

// ============================================================
// LIBRARIAN MANAGEMENT
// ============================================================

router.post(
  "/librarians",
  auth("SUPER_ADMIN", "ADMIN"),
  requirePermission("LIBRARY", "MANAGE"),
  validateRequest(libraryValidation.createLibrarianValidationSchema),
  libraryControllers.createLibrarian
);

router.get("/me", auth("LIBRARIAN"), libraryControllers.getOwnProfile);

router.get(
  "/librarians",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  requirePermission("LIBRARY", "VIEW"),
  libraryControllers.getAllLibrarians
);

router.get(
  "/librarians/:id",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  requirePermission("LIBRARY", "VIEW"),
  libraryControllers.getLibrarianById
);

router.patch(
  "/librarians/:id",
  auth("SUPER_ADMIN", "ADMIN"),
  requirePermission("LIBRARY", "MANAGE"),
  validateRequest(libraryValidation.updateLibrarianValidationSchema),
  libraryControllers.updateLibrarian
);

router.patch(
  "/librarians/:id/status",
  auth("SUPER_ADMIN", "ADMIN"),
  requirePermission("LIBRARY", "MANAGE"),
  validateRequest(libraryValidation.changeLibrarianStatusValidationSchema),
  libraryControllers.changeLibrarianStatus
);

// ============================================================
// BOOK CATEGORIES
// ============================================================

router.post(
  "/categories",
  auth("SUPER_ADMIN", "ADMIN", "LIBRARIAN"),
  requirePermission("LIBRARY", "CREATE"),
  validateRequest(libraryValidation.createCategoryValidationSchema),
  libraryControllers.createBookCategory
);

// Everyone authenticated can browse categories
router.get(
  "/categories",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL", "VICE_PRINCIPAL", "TEACHER", "LIBRARIAN", "STUDENT", "PARENT"),
  requirePermission("LIBRARY", "VIEW"),
  libraryControllers.getAllBookCategories
);

router.patch(
  "/categories/:id",
  auth("SUPER_ADMIN", "ADMIN", "LIBRARIAN"),
  requirePermission("LIBRARY", "UPDATE"),
  validateRequest(libraryValidation.updateCategoryValidationSchema),
  libraryControllers.updateBookCategory
);

router.delete(
  "/categories/:id",
  auth("SUPER_ADMIN", "ADMIN"),
  requirePermission("LIBRARY", "DELETE"),
  libraryControllers.deleteBookCategory
);

// ============================================================
// BOOKS
// ============================================================

router.post(
  "/books",
  auth("SUPER_ADMIN", "ADMIN", "LIBRARIAN"),
  requirePermission("LIBRARY", "CREATE"),
  validateRequest(libraryValidation.createBookValidationSchema),
  libraryControllers.createBook
);

// Everyone can search and browse books
router.get(
  "/books",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL", "VICE_PRINCIPAL", "TEACHER", "LIBRARIAN", "STUDENT", "PARENT"),
  requirePermission("LIBRARY", "VIEW"),
  libraryControllers.getAllBooks
);

router.get(
  "/books/:id",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL", "VICE_PRINCIPAL", "TEACHER", "LIBRARIAN", "STUDENT", "PARENT"),
  requirePermission("LIBRARY", "VIEW"),
  libraryControllers.getBookById
);

router.patch(
  "/books/:id",
  auth("SUPER_ADMIN", "ADMIN", "LIBRARIAN"),
  requirePermission("LIBRARY", "UPDATE"),
  validateRequest(libraryValidation.updateBookValidationSchema),
  libraryControllers.updateBook
);

router.patch(
  "/books/:id/copies",
  auth("SUPER_ADMIN", "ADMIN", "LIBRARIAN"),
  requirePermission("LIBRARY", "UPDATE"),
  validateRequest(libraryValidation.addCopiesValidationSchema),
  libraryControllers.addBookCopies
);

router.delete(
  "/books/:id",
  auth("SUPER_ADMIN", "ADMIN"),
  requirePermission("LIBRARY", "DELETE"),
  libraryControllers.deleteBook
);

// ============================================================
// BORROWS
// ============================================================

/**
 * Issue a book to a student
 * POST /api/library/borrows
 */
router.post(
  "/borrows",
  auth("SUPER_ADMIN", "ADMIN", "LIBRARIAN"),
  requirePermission("LIBRARY", "CREATE"),
  validateRequest(libraryValidation.issueBorrowValidationSchema),
  libraryControllers.issueBook
);

/**
 * Get all borrow records (filterable by status, bookId, studentId)
 * GET /api/library/borrows?status=BORROWED&studentId=&bookId=
 */
router.get(
  "/borrows",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL", "LIBRARIAN"),
  requirePermission("LIBRARY", "VIEW"),
  libraryControllers.getAllBorrows
);

/**
 * Get single borrow record (includes live overdue projection)
 * GET /api/library/borrows/:id
 */
router.get(
  "/borrows/:id",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL", "LIBRARIAN"),
  requirePermission("LIBRARY", "VIEW"),
  libraryControllers.getBorrowById
);

/**
 * Return a book (auto-creates fine if overdue)
 * PATCH /api/library/borrows/:borrowId/return
 */
router.patch(
  "/borrows/:borrowId/return",
  auth("SUPER_ADMIN", "ADMIN", "LIBRARIAN"),
  requirePermission("LIBRARY", "UPDATE"),
  validateRequest(libraryValidation.returnBorrowValidationSchema),
  libraryControllers.returnBook
);

/**
 * Get a student's full borrow history
 * GET /api/library/borrows/student/:studentId?status=&page=&limit=
 */
router.get(
  "/borrows/student/:studentId",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL", "LIBRARIAN", "TEACHER"),
  requirePermission("LIBRARY", "VIEW"),
  libraryControllers.getStudentBorrowHistory
);

// ============================================================
// FINES
// ============================================================

/**
 * Get all fines (filterable by status, studentId)
 * GET /api/library/fines?status=PENDING&studentId=
 */
router.get(
  "/fines",
  auth("SUPER_ADMIN", "ADMIN", "PRINCIPAL", "LIBRARIAN"),
  requirePermission("LIBRARY", "VIEW"),
  libraryControllers.getAllFines
);

/**
 * Mark fine as PAID or WAIVED
 * PATCH /api/library/fines/:id
 */
router.patch(
  "/fines/:id",
  auth("SUPER_ADMIN", "ADMIN", "LIBRARIAN"),
  requirePermission("LIBRARY", "UPDATE"),
  validateRequest(libraryValidation.updateFineValidationSchema),
  libraryControllers.updateFine
);

export const libraryRoutes = router;