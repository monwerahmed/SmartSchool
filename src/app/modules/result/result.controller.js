import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { resultServices } from "./result.service.js";


// ========================================
// SUBJECT CONTROLLERS
// ========================================

/**
 * Create subject
 */
const createSubject = catchAsync(async (req, res) => {
  const result = await resultServices.createSubjectIntoDB(req.body, req.user);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Subject created successfully",
    data: result,
  });
});

/**
 * Get all subjects
 */
const getAllSubjects = catchAsync(async (req, res) => {
  const result = await resultServices.getAllSubjectsFromDB(req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Subjects retrieved successfully",
    data: result,
  });
});

/**
 * Get single subject
 */
const getSingleSubject = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await resultServices.getSingleSubjectFromDB(id, req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Subject retrieved successfully",
    data: result,
  });
});

// ========================================
// EXAM CONTROLLERS
// ========================================

/**
 * Create exam
 */
const createExam = catchAsync(async (req, res) => {
  const result = await resultServices.createExamIntoDB(req.body, req.user);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Exam created successfully",
    data: result,
  });
});

/**
 * Get all exams
 */
const getAllExams = catchAsync(async (req, res) => {
  const result = await resultServices.getAllExamsFromDB(req.query, req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Exams retrieved successfully",
    data: result,
  });
});

/**
 * Get single exam
 */
const getSingleExam = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await resultServices.getSingleExamFromDB(id, req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Exam retrieved successfully",
    data: result,
  });
});

/**
 * Delete single exam
 */
const deleteSingleExam = catchAsync(async (req, res) => {
  const {id} = req.params;
  console.log("Exam Id :", id );
  const exam = await resultServices.deleteSingleExamFromDB(id) ;
  console.log("Exam Id :", id );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Exam deleted successfully",
    data: exam,
  });
});

/**
 * Update Exam
 */
const updateExam = catchAsync(async (req, res) => {
  const { id } = req.params; // Extracts the UUID from /exams/:id
  const payload = req.body;   // Extracts the update data

  const result = await resultServices.updateExam(id, payload);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Exam updated successfully!',
    data: result,
  });
});


// ========================================
// RESULT CONTROLLERS
// ========================================

/**
 * Enter single result
 */
const enterResult = catchAsync(async (req, res) => {
  const result = await resultServices.enterResultIntoDB(req.body, req.user);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Result entered successfully",
    data: result,
  });
});

/**
 * Bulk result entry
 */
const bulkResultEntry = catchAsync(async (req, res) => {
  const result = await resultServices.bulkResultEntryIntoDB(req.body, req.user);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Results entered successfully",
    data: result,
  });
});

/**
 * Get student report card
 */
const getStudentReportCard = catchAsync(async (req, res) => {
  const { studentId, examId, sectionId } = req.params;
  //console.log("requestingUser controller : ", req.user);
  const result = await resultServices.getStudentReportCard(
    studentId,
    examId,
    req.user,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Report card retrieved successfully",
    data: result,
  });
});

/**
 * Get section summary
 */
const getSectionSummary = catchAsync(async (req, res) => {
  const { sectionId, examId } = req.params;
  const result = await resultServices.getSectionSummary(
    sectionId,
    examId,
    req.user,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Section summary retrieved successfully",
    data: result,
  });
});

/**
 * Get subject analysis
 */
const getSubjectAnalysis = catchAsync(async (req, res) => {
  const { examId, subjectId } = req.params;
  const result = await resultServices.getSubjectAnalysis(
    examId,
    subjectId,
    req.user,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Subject analysis retrieved successfully",
    data: result,
  });
});

/**
 * Update result
 */
const updateResult = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await resultServices.updateResultIntoDB(
    id,
    req.body,
    req.user,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Result updated successfully",
    data: result,
  });
});

/**
 * Get all results
 */

const getAllResults = catchAsync(async (req, res) => {
  console.log("user Info", req.user);
  const result = await resultServices.getAllResultsFromDB(req.query, req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Results retrieved successfully",
    data: result,
  });
});

/**
 * Get single result
 */
const getSingleResult = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await resultServices.getSingleResultFromDB(id, req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Result retrieved successfully",
    data: result,
  });
});

export const resultControllers = {
  // Subject
  createSubject,
  getAllSubjects,
  getSingleSubject,

  // Exam
  createExam,
  getAllExams,
  getSingleExam,
  deleteSingleExam,
  updateExam,

  // Result
  enterResult,
  bulkResultEntry,
  getStudentReportCard,
  getSectionSummary,
  getSubjectAnalysis,
  updateResult,
  getAllResults,
  getSingleResult,
};
