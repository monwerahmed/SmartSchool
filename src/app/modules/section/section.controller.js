import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { sectionServices } from "./section.service.js";

/**
 * Create section
 */
const createSection = catchAsync(async (req, res) => {
  const result = await sectionServices.createSectionIntoDB(req.body, req.user);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Section created successfully",
    data: result,
  });
});

/**
 * Get all sections
 */
const getAllSections = catchAsync(async (req, res) => {
  const result = await sectionServices.getAllSectionsFromDB(
    req.query,
    req.user
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Sections retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

/**
 * Get single section
 */

const getSectionById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await sectionServices.getSectionByIdFromDB(id, req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Section retrieved successfully",
    data: result,
  });
});


/**
 * Update section
 */
const updateSection = catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await sectionServices.updateSectionIntoDB(
    id,
    req.body,
    req.user
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Section updated successfully",
    data: result,
  });
});


/**
 * Delete section
 */
const deleteSection = catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await sectionServices.deleteSectionFromDB(id, req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Section deleted successfully",
    data: result,
  });
});

export const sectionControllers = {
  createSection,
  getAllSections,
  getSectionById,
  updateSection,
  deleteSection,
};
