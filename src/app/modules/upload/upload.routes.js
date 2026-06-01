// ============================================================
// src/modules/upload/upload.routes.js
// ============================================================
import express from "express";
import auth from "../../middlewares/auth.js";
import {
  uploadProfilePhoto,
  uploadDocument,
  uploadBoth,
}from "../../middlewares/multer.js";

import { uploadControllers } from "./upload.controller.js";

const router = express.Router();

// All authenticated roles (for own-file operations)
const ALL_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "PRINCIPAL",
  "VICE_PRINCIPAL",
  "TEACHER",
  "STUDENT",
  "GUARDIAN",
  "ACCOUNTANT",
  "LIBRARIAN",
];

// Higher authority roles (for viewing others' files)
const ADMIN_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "PRINCIPAL",
  "VICE_PRINCIPAL",
];

// ============================================================
// OWN FILE OPERATIONS (logged-in user manages their own files)
// ============================================================

/**
 * GET /api/uploads/me
 * Get own profile photo + document URLs
 */
router.get("/me", auth(...ALL_ROLES), uploadControllers.getOwnFiles);

/**
 * POST /api/uploads/profile-photo
 * Upload own profile photo
 * Form-data field: "profilePhoto" (image file)
 */
router.post(
  "/profile-photo",
  auth(...ALL_ROLES),
  uploadProfilePhoto,
  uploadControllers.uploadProfilePhoto
);

/**
 * POST /api/uploads/document
 * Upload own document (NID/certificate)
 * Form-data fields: "documentFile" (PDF or image), "documentType" (text)
 */
router.post(
  "/document",
  auth(...ALL_ROLES),
  uploadDocument,
  uploadControllers.uploadDocument
);

/**
 * POST /api/uploads/both
 * Upload profile photo + document in one request
 * Form-data fields: "profilePhoto", "documentFile", "documentType"
 */
router.post(
  "/both",
  auth(...ALL_ROLES),
  uploadBoth,
  uploadControllers.uploadBoth
);

/**
 * DELETE /api/uploads/profile-photo
 * Delete own profile photo from Cloudinary + DB
 */
router.delete(
  "/profile-photo",
  auth(...ALL_ROLES),
  uploadControllers.deleteProfilePhoto
);

/**
 * DELETE /api/uploads/document
 * Delete own document from Cloudinary + DB
 */
router.delete(
  "/document",
  auth(...ALL_ROLES),
  uploadControllers.deleteDocument
);

// ============================================================
// ADMIN VIEW OPERATIONS (higher authority views others' files)
// ============================================================

/**
 * GET /api/uploads/:userType
 * Get all files for a user type (paginated)
 * userType: student | teacher | guardian | librarian
 * Query: ?page=1&limit=10&hasPhoto=true&hasDocument=false
 */
router.get(
  "/:userType",
  auth(...ADMIN_ROLES),
  uploadControllers.getAllFiles
);

/**
 * GET /api/uploads/:userType/:id
 * Get files for a single user by their profile ID
 * userType: student | teacher | guardian | librarian
 */
router.get(
  "/:userType/:id",
  auth(...ADMIN_ROLES),
  uploadControllers.getFilesById
);

export const uploadRoutes = router;