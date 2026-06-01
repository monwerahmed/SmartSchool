import prisma from "../../config/database.js";
import AppError from "../../error/AppError.js";
import httpStatus from "http-status";
import { hashPassword } from "../user/user.utils.js";
import {
  LIBRARIAN_SEARCHABLE_FIELDS,
  BOOK_SEARCHABLE_FIELDS,
  FINE_PER_DAY,
} from "./library.constants.js";

// ============================================================
// LIBRARIAN SERVICES
// ============================================================

const createLibrarianIntoDB = async (payload, requestingUser) => {
  const {
    username,
    email,
    password,
    librarianCode,
    fullNameEnglish,
    fullNameBangla,
    gender,
    bloodGroup,
    dateOfBirth,
    qualification,
    designation,
    joiningDate,
    phone,
    librarianEmail,
    address,
    nid,
    salary,
  } = payload;

  const institutionId = requestingUser.institutionId;

  if (!institutionId) {
    throw new AppError(httpStatus.BAD_REQUEST, "Institution ID not found in token.");
  }

  const institution = await prisma.institution.findUnique({
    where: { id: institutionId },
    select: { id: true, name: true, status: true },
  });

  if (!institution) {
    throw new AppError(httpStatus.NOT_FOUND, "Institution not found");
  }

  if (institution.status !== "ACTIVE") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot create librarian for ${institution.status} institution`
    );
  }

  const [existingCode, existingEmail, existingUsername, existingNID] =
    await Promise.all([
      prisma.librarian.findUnique({ where: { librarianCode } }),
      prisma.user.findUnique({ where: { email } }),
      prisma.user.findUnique({ where: { username } }),
      nid ? prisma.librarian.findUnique({ where: { nid } }) : null,
    ]);

  if (existingCode) {
    throw new AppError(httpStatus.CONFLICT, `Librarian code "${librarianCode}" already exists`);
  }
  if (existingEmail) {
    throw new AppError(httpStatus.CONFLICT, "User with this email already exists");
  }
  if (existingUsername) {
    throw new AppError(httpStatus.CONFLICT, "Username already taken");
  }
  if (existingNID) {
    throw new AppError(httpStatus.CONFLICT, "Librarian with this NID already exists");
  }

  const librarianRole = await prisma.role.findUnique({ where: { name: "LIBRARIAN" } });
  if (!librarianRole) {
    throw new AppError(httpStatus.NOT_FOUND, "LIBRARIAN role not found. Please run seed first!");
  }

  const hashedPassword = await hashPassword(password);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { username, email, password: hashedPassword, institutionId },
    });

    await tx.userRole.create({
      data: { userId: user.id, roleId: librarianRole.id },
    });

    const librarian = await tx.librarian.create({
      data: {
        librarianCode,
        fullNameEnglish,
        fullNameBangla,
        gender,
        bloodGroup,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        qualification,
        designation,
        joiningDate: joiningDate ? new Date(joiningDate) : undefined,
        phone,
        email: librarianEmail,
        address,
        nid,
        salary,
        userId: user.id,
        institutionId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            isActive: true,
            userRoles: {
              include: {
                role: { select: { id: true, name: true, description: true } },
              },
            },
          },
        },
        institution: { select: { id: true, name: true, code: true } },
      },
    });

    return librarian;
  });

  return {
    id: result.id,
    librarianCode: result.librarianCode,
    fullNameEnglish: result.fullNameEnglish,
    fullNameBangla: result.fullNameBangla,
    gender: result.gender,
    bloodGroup: result.bloodGroup,
    qualification: result.qualification,
    designation: result.designation,
    phone: result.phone,
    email: result.email,
    address: result.address,
    nid: result.nid,
    salary: result.salary,
    user: {
      id: result.user.id,
      username: result.user.username,
      email: result.user.email,
      isActive: result.user.isActive,
    },
    roles: result.user.userRoles.map((ur) => ur.role),
    institution: result.institution,
    createdAt: result.createdAt,
  };
};

const getOwnProfileFromDB = async (userId) => {
  const librarian = await prisma.librarian.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          isActive: true,
          userRoles: {
            include: {
              role: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                },
              },
            },
          },
        },
      },
      institution: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });

  if (!librarian) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Librarian profile not found for this user",
    );
  }

  return {
    ...librarian,
    roles: librarian.user.userRoles.map((ur) => ur.role),
    user: {
      id: librarian.user.id,
      username: librarian.user.username,
      email: librarian.user.email,
      isActive: librarian.user.isActive,
    },
  };
};

const getAllLibrariansFromDB = async (query, requestingUser) => {
  const {
    search,
    gender,
    designation,
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query;

  const where = {};

  if (!requestingUser.roles.includes("SUPER_ADMIN")) {
    where.institutionId = requestingUser.institutionId;
  } else if (query.institutionId) {
    where.institutionId = query.institutionId;
  }

  if (search) {
    where.OR = LIBRARIAN_SEARCHABLE_FIELDS.map((field) => ({
      [field]: { contains: search, mode: "insensitive" },
    }));
  }

  if (gender) where.gender = gender;
  if (designation) where.designation = { contains: designation, mode: "insensitive" };

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const [librarians, total] = await Promise.all([
    prisma.librarian.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        librarianCode: true,
        fullNameEnglish: true,
        fullNameBangla: true,
        gender: true,
        designation: true,
        phone: true,
        email: true,
        user: { select: { id: true, username: true, email: true, isActive: true } },
        institution: { select: { id: true, name: true, code: true } },
        createdAt: true,
      },
    }),
    prisma.librarian.count({ where }),
  ]);

  return {
    data: librarians,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

const getLibrarianByIdFromDB = async (id, requestingUser) => {
  const librarian = await prisma.librarian.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          isActive: true,
          userRoles: {
            include: {
              role: { select: { id: true, name: true, description: true } },
            },
          },
        },
      },
      institution: { select: { id: true, name: true, code: true } },
    },
  });

  if (!librarian) {
    throw new AppError(httpStatus.NOT_FOUND, "Librarian not found");
  }

  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    librarian.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(httpStatus.FORBIDDEN, "You can only view librarians in your own institution");
  }

  return {
    ...librarian,
    roles: librarian.user.userRoles.map((ur) => ur.role),
    user: {
      id: librarian.user.id,
      username: librarian.user.username,
      email: librarian.user.email,
      isActive: librarian.user.isActive,
    },
  };
};

const updateLibrarianIntoDB = async (id, payload, requestingUser) => {
  const existing = await prisma.librarian.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(httpStatus.NOT_FOUND, "Librarian not found");
  }

  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    existing.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(httpStatus.FORBIDDEN, "You can only update librarians in your own institution");
  }

  const updateData = {
    ...payload,
    email: payload.librarianEmail ?? undefined,
    librarianEmail: undefined,
  };

  return prisma.librarian.update({
    where: { id },
    data: updateData,
    include: {
      user: { select: { id: true, username: true, email: true, isActive: true } },
      institution: { select: { id: true, name: true, code: true } },
    },
  });
};

const changeLibrarianStatusIntoDB = async (id, status, requestingUser) => {
  const existing = await prisma.librarian.findUnique({
    where: { id },
    include: { user: { select: { id: true, isActive: true } } },
  });

  if (!existing) {
    throw new AppError(httpStatus.NOT_FOUND, "Librarian not found");
  }

  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    existing.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(httpStatus.FORBIDDEN, "You can only change status of librarians in your own institution");
  }

  await prisma.user.update({
    where: { id: existing.userId },
    data: { isActive: status },
  });

  return {
    id: existing.id,
    librarianCode: existing.librarianCode,
    fullNameEnglish: existing.fullNameEnglish,
    previousStatus: existing.user.isActive,
    newStatus: status,
  };
};

// ============================================================
// BOOK CATEGORY SERVICES
// ============================================================

const createBookCategoryIntoDB = async (payload, requestingUser) => {
  const institutionId = requestingUser.institutionId;

  if (!institutionId) {
    throw new AppError(httpStatus.BAD_REQUEST, "Institution ID not found in token.");
  }

  const existing = await prisma.bookCategory.findFirst({
    where: { name: payload.name, institutionId },
  });

  if (existing) {
    throw new AppError(httpStatus.CONFLICT, `Category "${payload.name}" already exists`);
  }

  return prisma.bookCategory.create({
    data: { ...payload, institutionId },
  });
};

const getAllBookCategoriesFromDB = async (query, requestingUser) => {
  const { search, page = 1, limit = 20, sortBy = "name", sortOrder = "asc" } = query;

  const where = {};

  if (!requestingUser.roles.includes("SUPER_ADMIN")) {
    where.institutionId = requestingUser.institutionId;
  } else if (query.institutionId) {
    where.institutionId = query.institutionId;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const [categories, total] = await Promise.all([
    prisma.bookCategory.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      include: { _count: { select: { books: true } } },
    }),
    prisma.bookCategory.count({ where }),
  ]);

  return {
    data: categories.map((c) => ({ ...c, bookCount: c._count.books, _count: undefined })),
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

const updateBookCategoryIntoDB = async (id, payload, requestingUser) => {
  const existing = await prisma.bookCategory.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(httpStatus.NOT_FOUND, "Book category not found");
  }

  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    existing.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(httpStatus.FORBIDDEN, "You can only update categories in your own institution");
  }

  if (payload.name && payload.name !== existing.name) {
    const nameConflict = await prisma.bookCategory.findFirst({
      where: { name: payload.name, institutionId: existing.institutionId, id: { not: id } },
    });
    if (nameConflict) {
      throw new AppError(httpStatus.CONFLICT, `Category "${payload.name}" already exists`);
    }
  }

  return prisma.bookCategory.update({ where: { id }, data: payload });
};

const deleteBookCategoryIntoDB = async (id, requestingUser) => {
  const existing = await prisma.bookCategory.findUnique({
    where: { id },
    include: { _count: { select: { books: true } } },
  });

  if (!existing) {
    throw new AppError(httpStatus.NOT_FOUND, "Book category not found");
  }

  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    existing.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(httpStatus.FORBIDDEN, "You can only delete categories in your own institution");
  }

  if (existing._count.books > 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot delete category. It has ${existing._count.books} book(s) assigned. Reassign or delete them first.`
    );
  }

  await prisma.bookCategory.delete({ where: { id } });
  return { id: existing.id, name: existing.name, deleted: true };
};

// ============================================================
// BOOK SERVICES
// ============================================================

const createBookIntoDB = async (payload, requestingUser) => {
  const institutionId = requestingUser.institutionId;

  if (!institutionId) {
    throw new AppError(httpStatus.BAD_REQUEST, "Institution ID not found in token.");
  }

  const category = await prisma.bookCategory.findUnique({ where: { id: payload.categoryId } });

  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, "Book category not found");
  }

  if (category.institutionId !== institutionId) {
    throw new AppError(httpStatus.BAD_REQUEST, "Category does not belong to your institution");
  }

  return prisma.book.create({
    data: { ...payload, availableCopies: payload.totalCopies, institutionId },
    include: { category: { select: { id: true, name: true, color: true } } },
  });
};

const getAllBooksFromDB = async (query, requestingUser) => {
  const {
    search,
    categoryId,
    status,
    language,
    publishedYear,
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query;

  const where = {};

  if (!requestingUser.roles.includes("SUPER_ADMIN")) {
    where.institutionId = requestingUser.institutionId;
  } else if (query.institutionId) {
    where.institutionId = query.institutionId;
  }

  if (search) {
    where.OR = BOOK_SEARCHABLE_FIELDS.map((field) => ({
      [field]: { contains: search, mode: "insensitive" },
    }));
  }

  if (categoryId) where.categoryId = categoryId;
  if (status) where.status = status;
  if (language) where.language = { contains: language, mode: "insensitive" };
  if (publishedYear) where.publishedYear = Number(publishedYear);

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const [books, total] = await Promise.all([
    prisma.book.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      include: {
        category: { select: { id: true, name: true, color: true } },
        _count: { select: { borrows: true } },
      },
    }),
    prisma.book.count({ where }),
  ]);

  return {
    data: books.map((b) => ({ ...b, totalBorrows: b._count.borrows, _count: undefined })),
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

const getBookByIdFromDB = async (id, requestingUser) => {
  const book = await prisma.book.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true, color: true } },
      // Show who currently has each active copy
      borrows: {
        where: { status: "BORROWED" },
        select: {
          id: true,
          borrowDate: true,
          dueDate: true,
          student: {
            select: { id: true, studentCode: true, fullNameEnglish: true },
          },
        },
      },
    },
  });

  if (!book) {
    throw new AppError(httpStatus.NOT_FOUND, "Book not found");
  }

  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    book.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(httpStatus.FORBIDDEN, "You can only view books in your own institution");
  }

  return book;
};

const updateBookIntoDB = async (id, payload, requestingUser) => {
  const existing = await prisma.book.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(httpStatus.NOT_FOUND, "Book not found");
  }

  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    existing.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(httpStatus.FORBIDDEN, "You can only update books in your own institution");
  }

  if (payload.categoryId && payload.categoryId !== existing.categoryId) {
    const category = await prisma.bookCategory.findUnique({ where: { id: payload.categoryId } });
    if (!category || category.institutionId !== existing.institutionId) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid category for this institution");
    }
  }

  return prisma.book.update({
    where: { id },
    data: payload,
    include: { category: { select: { id: true, name: true, color: true } } },
  });
};

const addBookCopiesIntoDB = async (id, copiesToAdd, requestingUser) => {
  const existing = await prisma.book.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(httpStatus.NOT_FOUND, "Book not found");
  }

  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    existing.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(httpStatus.FORBIDDEN, "You can only update books in your own institution");
  }

  return prisma.book.update({
    where: { id },
    data: {
      totalCopies: { increment: copiesToAdd },
      availableCopies: { increment: copiesToAdd },
      status: existing.status === "UNAVAILABLE" ? "AVAILABLE" : existing.status,
    },
    include: { category: { select: { id: true, name: true, color: true } } },
  });
};

const deleteBookIntoDB = async (id, requestingUser) => {
  const existing = await prisma.book.findUnique({
    where: { id },
    include: { _count: { select: { borrows: { where: { status: "BORROWED" } } } } },
  });

  if (!existing) {
    throw new AppError(httpStatus.NOT_FOUND, "Book not found");
  }

  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    existing.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(httpStatus.FORBIDDEN, "You can only delete books in your own institution");
  }

  if (existing._count.borrows > 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot delete book. It has ${existing._count.borrows} active borrow(s). Wait for all copies to be returned first.`
    );
  }

  await prisma.book.delete({ where: { id } });
  return { id: existing.id, title: existing.title, deleted: true };
};

// ============================================================
// BORROW SERVICES (Students only)
// ============================================================

/**
 * Issue a book to a student
 */
const issueBookIntoDB = async (payload, requestingUser) => {
  const { bookId, studentId, dueDate, notes } = payload;
  const institutionId = requestingUser.institutionId;

  const book = await prisma.book.findUnique({ where: { id: bookId } });

  if (!book) {
    throw new AppError(httpStatus.NOT_FOUND, "Book not found");
  }

  if (book.institutionId !== institutionId) {
    throw new AppError(httpStatus.FORBIDDEN, "Book does not belong to your institution");
  }

  if (book.availableCopies < 1) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "No available copies. All copies are currently borrowed."
    );
  }

  if (book.status === "LOST" || book.status === "DAMAGED") {
    throw new AppError(httpStatus.BAD_REQUEST, `Cannot issue a book with status: ${book.status}`);
  }

  const student = await prisma.student.findUnique({ where: { id: studentId } });

  if (!student) {
    throw new AppError(httpStatus.NOT_FOUND, "Student not found");
  }

  if (student.institutionId !== institutionId) {
    throw new AppError(httpStatus.BAD_REQUEST, "Student does not belong to your institution");
  }

  // Block if student already has this specific book borrowed
  const activeBorrow = await prisma.bookBorrow.findFirst({
    where: { bookId, studentId, status: "BORROWED" },
  });

  if (activeBorrow) {
    throw new AppError(
      httpStatus.CONFLICT,
      "This student already has an active borrow for this book"
    );
  }

  const dueDateObj = new Date(dueDate);
  if (dueDateObj <= new Date()) {
    throw new AppError(httpStatus.BAD_REQUEST, "Due date must be in the future");
  }

  const result = await prisma.$transaction(async (tx) => {
    const borrow = await tx.bookBorrow.create({
      data: {
        bookId,
        studentId,
        dueDate: dueDateObj,
        notes,
        issuedById: requestingUser.userId,
        institutionId,
        status: "BORROWED",
      },
      include: {
        book: { select: { id: true, title: true, author: true } },
        student: { select: { id: true, studentCode: true, fullNameEnglish: true } },
      },
    });

    await tx.book.update({
      where: { id: bookId },
      data: {
        availableCopies: { decrement: 1 },
        status: book.availableCopies === 1 ? "UNAVAILABLE" : book.status,
      },
    });

    return borrow;
  });

  return result;
};

/**
 * Return a book
 * Auto-calculates and creates fine if returned late
 */
const returnBookIntoDB = async (borrowId, payload, requestingUser) => {
  const borrow = await prisma.bookBorrow.findUnique({
    where: { id: borrowId },
    include: { book: true, fine: true },
  });

  if (!borrow) {
    throw new AppError(httpStatus.NOT_FOUND, "Borrow record not found");
  }

  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    borrow.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(httpStatus.FORBIDDEN, "This borrow record does not belong to your institution");
  }

  if (borrow.status === "RETURNED") {
    throw new AppError(httpStatus.BAD_REQUEST, "This book has already been returned");
  }

  const returnDate = new Date();
  const dueDate = new Date(borrow.dueDate);
  const isOverdue = returnDate > dueDate;
  let fine = null;

  const result = await prisma.$transaction(async (tx) => {
    const updatedBorrow = await tx.bookBorrow.update({
      where: { id: borrowId },
      data: {
        status: "RETURNED",
        returnDate,
        returnedById: requestingUser.userId,
        notes: payload.notes ?? borrow.notes,
      },
      include: {
        book: { select: { id: true, title: true, author: true } },
        student: { select: { id: true, studentCode: true, fullNameEnglish: true } },
      },
    });

    await tx.book.update({
      where: { id: borrow.bookId },
      data: { availableCopies: { increment: 1 }, status: "AVAILABLE" },
    });

    if (isOverdue && !borrow.fine) {
      const msPerDay = 1000 * 60 * 60 * 24;
      const overdueDays = Math.ceil((returnDate - dueDate) / msPerDay);
      const totalAmount = overdueDays * FINE_PER_DAY;

      fine = await tx.fine.create({
        data: {
          borrowId,
          overdueDays,
          perDayCharge: FINE_PER_DAY,
          totalAmount,
          status: "PENDING",
          institutionId: borrow.institutionId,
        },
      });
    }

    return updatedBorrow;
  });

  return {
    borrow: result,
    fine,
    isOverdue,
    message: isOverdue
      ? `Book returned ${Math.ceil((returnDate - dueDate) / (1000 * 60 * 60 * 24))} day(s) late. Fine of BDT ${fine?.totalAmount ?? 0} has been issued.`
      : "Book returned on time. No fine.",
  };
};

/**
 * Get all borrows
 */
const getAllBorrowsFromDB = async (query, requestingUser) => {
  const {
    status="BORROWED",
    bookId,
    studentId,
    page = 1,
    limit = 10,
    sortBy = "borrowDate",
    sortOrder = "desc",
  } = query;

  const where = {};

  if (!requestingUser.roles.includes("SUPER_ADMIN")) {
    where.institutionId = requestingUser.institutionId;
  } else if (query.institutionId) {
    where.institutionId = query.institutionId;
  }

  if (status) where.status = status;
  if (bookId) where.bookId = bookId;
  if (studentId) where.studentId = studentId;

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const [borrows, total] = await Promise.all([
    prisma.bookBorrow.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      include: {
        book: { select: { id: true, title: true, author: true, isbn: true } },
        student: { select: { id: true, studentCode: true, fullNameEnglish: true } },
        fine: { select: { id: true, totalAmount: true, status: true } },
        issuedBy: { select: { id: true, username: true } },
        returnedBy: { select: { id: true, username: true } },
        
      },
    }),
    prisma.bookBorrow.count({ where }),
  ]);

  return {
    data: borrows,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

/**
 * Get single borrow record with live overdue projection
 */
const getBorrowByIdFromDB = async (id, requestingUser) => {
  const borrow = await prisma.bookBorrow.findUnique({
    where: { id },
    include: {
      book: { include: { category: { select: { id: true, name: true } } } },
      student: {
        select: {
          id: true,
          studentCode: true,
          fullNameEnglish: true,
          fullNameBangla: true,
          phone: true,
        },
      },
      fine: true,
      issuedBy: { select: { id: true, username: true, email: true } },
      returnedBy: { select: { id: true, username: true, email: true } },
    },
  });

  if (!borrow) {
    throw new AppError(httpStatus.NOT_FOUND, "Borrow record not found");
  }

  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    borrow.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(httpStatus.FORBIDDEN, "This borrow record does not belong to your institution");
  }

  if (borrow.status === "BORROWED" && new Date() > new Date(borrow.dueDate)) {
    const msPerDay = 1000 * 60 * 60 * 24;
    const overdueDays = Math.ceil((new Date() - new Date(borrow.dueDate)) / msPerDay);
    return {
      ...borrow,
      isOverdue: true,
      overdueDays,
      projectedFine: overdueDays * FINE_PER_DAY,
    };
  }

  return { ...borrow, isOverdue: false };
};

/**
 * Get borrow history for a specific student
 */
const getStudentBorrowHistoryFromDB = async (studentId, query, requestingUser) => {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, studentCode: true, fullNameEnglish: true, institutionId: true },
  });

  if (!student) {
    throw new AppError(httpStatus.NOT_FOUND, "Student not found");
  }

  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    student.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(httpStatus.FORBIDDEN, "Student does not belong to your institution");
  }

  const { status, page = 1, limit = 10 } = query;
  const where = { studentId };
  if (status) where.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const [borrows, total] = await Promise.all([
    prisma.bookBorrow.findMany({
      where,
      skip,
      take,
      orderBy: { borrowDate: "desc" },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            isbn: true,
            category: { select: { id: true, name: true } },
          },
        },
        fine: { select: { id: true, totalAmount: true, status: true } },
      },
    }),
    prisma.bookBorrow.count({ where }),
  ]);

  return {
    student,
    data: borrows,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

// ============================================================
// FINE SERVICES
// ============================================================

const getAllFinesFromDB = async (query, requestingUser) => {
  const {
    status,
    studentId,
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query;

  const where = {};

  if (!requestingUser.roles.includes("SUPER_ADMIN")) {
    where.institutionId = requestingUser.institutionId;
  } else if (query.institutionId) {
    where.institutionId = query.institutionId;
  }

  if (status) where.status = status;
  if (studentId) where.borrow = { studentId };

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const [fines, total] = await Promise.all([
    prisma.fine.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      include: {
        borrow: {
          include: {
            book: { select: { id: true, title: true, author: true } },
            student: { select: { id: true, studentCode: true, fullNameEnglish: true } },
          },
        },
      },
    }),
    prisma.fine.count({ where }),
  ]);

  return {
    data: fines,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

const updateFineIntoDB = async (id, payload, requestingUser) => {
  const existing = await prisma.fine.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(httpStatus.NOT_FOUND, "Fine not found");
  }

  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    existing.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(httpStatus.FORBIDDEN, "You can only update fines in your own institution");
  }

  if (existing.status !== "PENDING") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Fine is already ${existing.status}. Cannot update a resolved fine.`
    );
  }

  if (payload.status === "PAID" && !payload.paidAmount) {
    throw new AppError(httpStatus.BAD_REQUEST, "paidAmount is required when marking fine as PAID");
  }

  return prisma.fine.update({
    where: { id },
    data: {
      status: payload.status,
      paidAmount: payload.paidAmount ?? null,
      paidAt: payload.status === "PAID" ? new Date() : null,
      remarks: payload.remarks ?? existing.remarks,
    },
    include: {
      borrow: {
        include: {
          book: { select: { id: true, title: true } },
          student: { select: { id: true, studentCode: true, fullNameEnglish: true } },
        },
      },
    },
  });
};

// ============================================================
// STATS SERVICE
// ============================================================

const getLibraryStatsFromDB = async (requestingUser) => {
  const institutionId = requestingUser.roles.includes("SUPER_ADMIN")
    ? undefined
    : requestingUser.institutionId;

  const where = institutionId ? { institutionId } : {};

  const [
    totalBooks,
    totalCopiesAgg,
    availableCopiesAgg,
    totalCategories,
    activeBorrows,
    overdueBorrows,
    pendingFines,
    totalFineAmountAgg,
  ] = await Promise.all([
    prisma.book.count({ where }),
    prisma.book.aggregate({ where, _sum: { totalCopies: true } }),
    prisma.book.aggregate({ where, _sum: { availableCopies: true } }),
    prisma.bookCategory.count({ where }),
    prisma.bookBorrow.count({ where: { ...where, status: "BORROWED" } }),
    prisma.bookBorrow.count({
      where: { ...where, status: "BORROWED", dueDate: { lt: new Date() } },
    }),
    prisma.fine.count({ where: { ...where, status: "PENDING" } }),
    prisma.fine.aggregate({
      where: { ...where, status: "PENDING" },
      _sum: { totalAmount: true },
    }),
  ]);

  const totalCopies = totalCopiesAgg._sum.totalCopies ?? 0;
  const availableCopies = availableCopiesAgg._sum.availableCopies ?? 0;

  return {
    books: {
      total: totalBooks,
      totalCopies,
      availableCopies,
      borrowedCopies: totalCopies - availableCopies,
    },
    categories: { total: totalCategories },
    borrows: { active: activeBorrows, overdue: overdueBorrows },
    fines: {
      pending: pendingFines,
      pendingAmount: totalFineAmountAgg._sum.totalAmount ?? 0,
    },
  };
};

export const libraryServices = {
  createLibrarianIntoDB,
  getAllLibrariansFromDB,
  getLibrarianByIdFromDB,
  getOwnProfileFromDB,
  updateLibrarianIntoDB,
  changeLibrarianStatusIntoDB,
  createBookCategoryIntoDB,
  getAllBookCategoriesFromDB,
  updateBookCategoryIntoDB,
  deleteBookCategoryIntoDB,
  createBookIntoDB,
  getAllBooksFromDB,
  getBookByIdFromDB,
  updateBookIntoDB,
  addBookCopiesIntoDB,
  deleteBookIntoDB,
  issueBookIntoDB,
  returnBookIntoDB,
  getAllBorrowsFromDB,
  getBorrowByIdFromDB,
  getStudentBorrowHistoryFromDB,
  getAllFinesFromDB,
  updateFineIntoDB,
  getLibraryStatsFromDB,
};