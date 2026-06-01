import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import httpStatus from "http-status";
import { institutionServices } from "./institute.service.js";

/**
 * Create new institution
 * Route: POST /api/institutions
 * Access: SUPER_ADMIN only
 */
const createInstitution = catchAsync(async (req, res) => {
  const result = await institutionServices.createInstitutionIntoDB(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Institution created successfully",
    data: result,
  });
});

/**
 * Get all institutions with pagination
 * Route: GET /api/institutions
 * Access: SUPER_ADMIN only
 */
const getAllInstitutions = catchAsync(async (req, res) => {
  const result = await institutionServices.getAllInstitutionsFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Institutions retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

/**
 * Get single institution by ID
 * Route: GET /api/institutions/:id
 * Access: SUPER_ADMIN (any institution), Others (own institution only)
 */
const getInstitutionById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { userId, roles } = req.user;

  const result = await institutionServices.getInstitutionByIdFromDB(
    id,
    userId,
    roles,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Institution retrieved successfully",
    data: result,
  });
});

/**
 * Update institution
 * Route: PATCH /api/institutions/:id
 * Access: SUPER_ADMIN (any institution), Others (own institution only)
 */
const updateInstitution = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { userId, roles } = req.user;

  const result = await institutionServices.updateInstitutionIntoDB(
    id,
    req.body,
    userId,
    roles,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Institution updated successfully",
    data: result,
  });
});

/**
 * Change institution status
 * Route: PATCH /api/institutions/:id/status
 * Access: SUPER_ADMIN only
 */
const changeInstitutionStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const result = await institutionServices.changeInstitutionStatusIntoDB(
    id,
    status,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Institution status changed to ${status} successfully`,
    data: result,
  });
});

/**
 * Get institution statistics
 * Route: GET /api/institutions/:id/stats
 * Access: SUPER_ADMIN (any institution), Others (own institution only)
 */
const getInstitutionStats = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { userId, roles } = req.user;

  const result = await institutionServices.getInstitutionStatsFromDB(
    id,
    userId,
    roles,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Institution statistics retrieved successfully",
    data: result,
  });
});

export const institutionControllers = {
  createInstitution,
  getAllInstitutions,
  getInstitutionById,
  updateInstitution,
  changeInstitutionStatus,
  getInstitutionStats,
};
