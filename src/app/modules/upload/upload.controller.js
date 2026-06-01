// ============================================================
// src/modules/upload/upload.controller.js
// ============================================================
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import httpStatus from "http-status";
import { uploadServices } from "./upload.service.js";

// ============================================================
// UPLOAD — own profile (logged-in user uploads for themselves)
// ============================================================

const uploadProfilePhoto = catchAsync(async (req, res) => {
  const result = await uploadServices.uploadProfilePhotoService(
    req.file,
    req.user
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

const uploadDocument = catchAsync(async (req, res) => {
  console.log("Controller working properly");
  const result = await uploadServices.uploadDocumentService(
    req.file,
    req.body.documentType,
    req.user
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

const uploadBoth = catchAsync(async (req, res) => {
  const result = await uploadServices.uploadBothService(
    req.files,
    req.body.documentType,
    req.user
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

// ============================================================
// DELETE — own files
// ============================================================

const deleteProfilePhoto = catchAsync(async (req, res) => {
  const result = await uploadServices.deleteProfilePhotoService(req.user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const deleteDocument = catchAsync(async (req, res) => {
  const result = await uploadServices.deleteDocumentService(req.user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

// ============================================================
// GET — own files
// ============================================================

const getOwnFiles = catchAsync(async (req, res) => {
  const result = await uploadServices.getOwnFilesService(req.user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Files retrieved successfully",
    data: result,
  });
});

// ============================================================
// GET — single user's files by profile ID (admin/higher roles)
// ============================================================

const getFilesById = catchAsync(async (req, res) => {
  const { userType, id } = req.params;
  const result = await uploadServices.getFilesByIdService(
    userType,
    id,
    req.user
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Files retrieved successfully",
    data: result,
  });
});

// ============================================================
// GET — all files for a user type (admin/higher roles)
// ============================================================

const getAllFiles = catchAsync(async (req, res) => {
  const { userType } = req.params;
  const result = await uploadServices.getAllFilesService(
    userType,
    req.query,
    req.user
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Files retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

export const uploadControllers = {
  uploadProfilePhoto,
  uploadDocument,
  uploadBoth,
  deleteProfilePhoto,
  deleteDocument,
  getOwnFiles,
  getFilesById,
  getAllFiles,
};