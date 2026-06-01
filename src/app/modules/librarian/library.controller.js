import sendResponse from "../../utils/sendResponse.js";
import catchAsync from "../../utils/catchAsync.js";
import httpStatus from "http-status";
import { libraryServices } from "./library.service.js";

// ============================================================
// LIBRARIAN
// ============================================================

const createLibrarian = catchAsync(async (req, res) => {
  const result = await libraryServices.createLibrarianIntoDB(req.body, req.user);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Librarian created successfully",
    data: result,
  });
});

const getAllLibrarians = catchAsync(async (req, res) => {
  const result = await libraryServices.getAllLibrariansFromDB(req.query, req.user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Librarians retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getLibrarianById = catchAsync(async (req, res) => {
  const result = await libraryServices.getLibrarianByIdFromDB(req.params.id, req.user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Librarian retrieved successfully",
    data: result,
  });
});

const getOwnProfile = catchAsync(async (req, res) => {
  const result = await libraryServices.getOwnProfileFromDB(req.user.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile retrieved successfully",
    data: result,
  });
});

const updateLibrarian = catchAsync(async (req, res) => {
  const result = await libraryServices.updateLibrarianIntoDB(req.params.id, req.body, req.user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Librarian updated successfully",
    data: result,
  });
});

const changeLibrarianStatus = catchAsync(async (req, res) => {
  const result = await libraryServices.changeLibrarianStatusIntoDB(
    req.params.id,
    req.body.status,
    req.user
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Librarian status changed to ${req.body.status} successfully`,
    data: result,
  });
});

// ============================================================
// BOOK CATEGORIES
// ============================================================

const createBookCategory = catchAsync(async (req, res) => {
  const result = await libraryServices.createBookCategoryIntoDB(req.body, req.user);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Book category created successfully",
    data: result,
  });
});

const getAllBookCategories = catchAsync(async (req, res) => {
  const result = await libraryServices.getAllBookCategoriesFromDB(req.query, req.user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Book categories retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const updateBookCategory = catchAsync(async (req, res) => {
  const result = await libraryServices.updateBookCategoryIntoDB(req.params.id, req.body, req.user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Book category updated successfully",
    data: result,
  });
});

const deleteBookCategory = catchAsync(async (req, res) => {
  const result = await libraryServices.deleteBookCategoryIntoDB(req.params.id, req.user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Book category deleted successfully",
    data: result,
  });
});

// ============================================================
// BOOKS
// ============================================================

const createBook = catchAsync(async (req, res) => {
  const result = await libraryServices.createBookIntoDB(req.body, req.user);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Book added successfully",
    data: result,
  });
});

const getAllBooks = catchAsync(async (req, res) => {
  const result = await libraryServices.getAllBooksFromDB(req.query, req.user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Books retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getBookById = catchAsync(async (req, res) => {
  const result = await libraryServices.getBookByIdFromDB(req.params.id, req.user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Book retrieved successfully",
    data: result,
  });
});

const updateBook = catchAsync(async (req, res) => {
  const result = await libraryServices.updateBookIntoDB(req.params.id, req.body, req.user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Book updated successfully",
    data: result,
  });
});

const addBookCopies = catchAsync(async (req, res) => {
  const result = await libraryServices.addBookCopiesIntoDB(
    req.params.id,
    req.body.copiesToAdd,
    req.user
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `${req.body.copiesToAdd} copies added successfully`,
    data: result,
  });
});

const deleteBook = catchAsync(async (req, res) => {
  const result = await libraryServices.deleteBookIntoDB(req.params.id, req.user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Book deleted successfully",
    data: result,
  });
});

// ============================================================
// BORROWS
// ============================================================

const issueBook = catchAsync(async (req, res) => {
  const result = await libraryServices.issueBookIntoDB(req.body, req.user);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Book issued successfully",
    data: result,
  });
});

const returnBook = catchAsync(async (req, res) => {
  const result = await libraryServices.returnBookIntoDB(req.params.borrowId, req.body, req.user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

const getAllBorrows = catchAsync(async (req, res) => {
  const result = await libraryServices.getAllBorrowsFromDB(req.query, req.user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Borrow records retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getBorrowById = catchAsync(async (req, res) => {
  const result = await libraryServices.getBorrowByIdFromDB(req.params.id, req.user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Borrow record retrieved successfully",
    data: result,
  });
});

const getStudentBorrowHistory = catchAsync(async (req, res) => {
  const result = await libraryServices.getStudentBorrowHistoryFromDB(
    req.params.studentId,
    req.query,
    req.user
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Student borrow history retrieved successfully",
    meta: result.meta,
    data: result,
  });
});

// ============================================================
// FINES
// ============================================================

const getAllFines = catchAsync(async (req, res) => {
  const result = await libraryServices.getAllFinesFromDB(req.query, req.user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Fines retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const updateFine = catchAsync(async (req, res) => {
  const result = await libraryServices.updateFineIntoDB(req.params.id, req.body, req.user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Fine marked as ${req.body.status} successfully`,
    data: result,
  });
});

// ============================================================
// STATS
// ============================================================

const getLibraryStats = catchAsync(async (req, res) => {
  const result = await libraryServices.getLibraryStatsFromDB(req.user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Library statistics retrieved successfully",
    data: result,
  });
});

export const libraryControllers = {
  createLibrarian,
  getAllLibrarians,
  getLibrarianById,
  getOwnProfile,
  updateLibrarian,
  changeLibrarianStatus,
  createBookCategory,
  getAllBookCategories,
  updateBookCategory,
  deleteBookCategory,
  createBook,
  getAllBooks,
  getBookById,
  updateBook,
  addBookCopies,
  deleteBook,
  issueBook,
  returnBook,
  getAllBorrows,
  getBorrowById,
  getStudentBorrowHistory,
  getAllFines,
  updateFine,
  getLibraryStats,
};