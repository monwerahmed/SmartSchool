import { z } from "zod";
import { Gender, BloodGroup, FineStatus } from "@prisma/client";

const phoneRegex = /^01[3-9]\d{8}$/;
const nidRegex = /^\d{10}$|^\d{13}$|^\d{17}$/;

// ========================================
// LIBRARIAN VALIDATIONS
// ========================================

export const createLibrarianValidationSchema = z.object({
  body: z.object({
    username: z
      .string({ required_error: "Username is required" })
      .min(3).max(20)
      .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
      .trim(),

    email: z
      .string({ required_error: "Email is required" })
      .email("Please provide a valid email address")
      .toLowerCase().trim(),

    password: z
      .string({ required_error: "Password is required" })
      .min(6).max(50),

    librarianCode: z
      .string({ required_error: "Librarian code is required" })
      .min(3).max(20).trim(),

    fullNameEnglish: z
      .string({ required_error: "Full name in English is required" })
      .min(3).max(100).trim(),

    fullNameBangla: z.string().min(3).max(100).trim().optional(),

    gender: z.nativeEnum(Gender, {
      required_error: "Gender is required",
      errorMap: () => ({ message: "Gender must be MALE, FEMALE, or OTHER" }),
    }),

    bloodGroup: z
      .nativeEnum(BloodGroup, { errorMap: () => ({ message: "Invalid blood group" }) })
      .optional(),

    dateOfBirth: z
      .string()
      .datetime({ message: "Date of birth must be a valid ISO datetime" })
      .optional(),

    qualification: z.string().max(200).trim().optional(),
    designation: z.string().max(100).trim().optional(),

    joiningDate: z
      .string()
      .datetime({ message: "Joining date must be a valid ISO datetime" })
      .optional(),

    phone: z
      .string()
      .regex(phoneRegex, "Phone must be a valid Bangladesh number (01XXXXXXXXX)")
      .optional(),

    librarianEmail: z
      .string().email().toLowerCase().trim().optional(),

    address: z.string().max(500).trim().optional(),

    nid: z
      .string()
      .regex(nidRegex, "NID must be 10, 13, or 17 digits")
      .trim()
      .optional(),

    salary: z.number().positive("Salary must be a positive number").optional(),
  }),
});

export const updateLibrarianValidationSchema = z.object({
  body: z.object({
    fullNameEnglish: z.string().min(3).max(100).trim().optional(),
    fullNameBangla: z.string().min(3).max(100).trim().optional(),

    librarianCode: z
      .never({ errorMap: () => ({ message: "Librarian code cannot be changed after creation" }) })
      .optional(),

    nid: z
      .never({ errorMap: () => ({ message: "NID cannot be changed after creation" }) })
      .optional(),

    gender: z
      .nativeEnum(Gender, { errorMap: () => ({ message: "Gender must be MALE, FEMALE, or OTHER" }) })
      .optional(),

    bloodGroup: z
      .nativeEnum(BloodGroup, { errorMap: () => ({ message: "Invalid blood group" }) })
      .optional(),

    qualification: z.string().max(200).trim().optional(),
    designation: z.string().max(100).trim().optional(),
    salary: z.number().positive().optional(),

    phone: z
      .string()
      .regex(phoneRegex, "Phone must be a valid Bangladesh number")
      .optional(),

    librarianEmail: z.string().email().toLowerCase().trim().optional(),
    address: z.string().max(500).trim().optional(),
  }),
});

export const changeLibrarianStatusValidationSchema = z.object({
  body: z.object({
    status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "BLOCKED"], {
      required_error: "Status is required",
      errorMap: () => ({ message: "Status must be ACTIVE, INACTIVE, SUSPENDED, or BLOCKED" }),
    }),
  }),
});

// ========================================
// BOOK CATEGORY VALIDATIONS
// ========================================

export const createCategoryValidationSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: "Category name is required" })
      .min(2).max(100).trim(),

    description: z.string().max(500).trim().optional(),

    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex code (e.g. #FF5733)")
      .optional(),
  }),
});

export const updateCategoryValidationSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).trim().optional(),
    description: z.string().max(500).trim().optional(),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex code (e.g. #FF5733)")
      .optional(),
  }),
});

// ========================================
// BOOK VALIDATIONS
// ========================================

export const createBookValidationSchema = z.object({
  body: z.object({
    title: z
      .string({ required_error: "Book title is required" })
      .min(1).max(300).trim(),

    author: z
      .string({ required_error: "Author name is required" })
      .min(2).max(200).trim(),

    categoryId: z
      .string({ required_error: "Category is required" })
      .uuid("Category ID must be a valid UUID"),

    isbn: z.string().max(20).trim().optional(),
    publisher: z.string().max(200).trim().optional(),
    edition: z.string().max(50).trim().optional(),
    language: z.string().max(50).trim().default("Bengali"),
    description: z.string().max(2000).trim().optional(),

    totalCopies: z
      .number({ required_error: "Total copies is required" })
      .int("Total copies must be a whole number")
      .min(1, "At least 1 copy is required")
      .max(10000),

    publishedYear: z
      .number()
      .int()
      .min(1000)
      .max(new Date().getFullYear(), "Published year cannot be in the future")
      .optional(),

    shelfNumber: z.string().max(20).trim().optional(),
    rackNumber: z.string().max(20).trim().optional(),
  }),
});

export const updateBookValidationSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(300).trim().optional(),
    author: z.string().min(2).max(200).trim().optional(),
    categoryId: z.string().uuid("Category ID must be a valid UUID").optional(),
    isbn: z.string().max(20).trim().optional(),
    publisher: z.string().max(200).trim().optional(),
    edition: z.string().max(50).trim().optional(),
    language: z.string().max(50).trim().optional(),
    description: z.string().max(2000).trim().optional(),
    publishedYear: z.number().int().min(1000).max(new Date().getFullYear()).optional(),
    shelfNumber: z.string().max(20).trim().optional(),
    rackNumber: z.string().max(20).trim().optional(),
    status: z
      .enum(["AVAILABLE", "UNAVAILABLE", "LOST", "DAMAGED"], {
        errorMap: () => ({ message: "Invalid book status" }),
      })
      .optional(),
  }),
});

export const addCopiesValidationSchema = z.object({
  body: z.object({
    copiesToAdd: z
      .number({ required_error: "Number of copies to add is required" })
      .int("Must be a whole number")
      .min(1, "Must add at least 1 copy")
      .max(1000),
  }),
});

// ========================================
// BORROW VALIDATIONS (students only)
// ========================================

export const issueBorrowValidationSchema = z.object({
  body: z.object({
    bookId: z
      .string({ required_error: "Book ID is required" })
      .uuid("Book ID must be a valid UUID"),

    studentId: z
      .string({ required_error: "Student ID is required" })
      .uuid("Student ID must be a valid UUID"),

    dueDate: z
      .string({ required_error: "Due date is required" })
      .datetime({ message: "Due date must be a valid ISO datetime" }),

    notes: z.string().max(500).trim().optional(),
  }),
});

export const returnBorrowValidationSchema = z.object({
  body: z.object({
    notes: z.string().max(500).trim().optional(),
  }),
});

// ========================================
// FINE VALIDATIONS
// ========================================

export const updateFineValidationSchema = z.object({
  body: z.object({
    status: z.nativeEnum(FineStatus, {
      required_error: "Fine status is required",
      errorMap: () => ({ message: "Status must be PENDING, PAID, or WAIVED" }),
    }),
    paidAmount: z.number().positive("Paid amount must be positive").optional(),
    remarks: z.string().max(500).trim().optional(),
  }),
});

export const libraryValidation = {
  createLibrarianValidationSchema,
  updateLibrarianValidationSchema,
  changeLibrarianStatusValidationSchema,
  createCategoryValidationSchema,
  updateCategoryValidationSchema,
  createBookValidationSchema,
  updateBookValidationSchema,
  addCopiesValidationSchema,
  issueBorrowValidationSchema,
  returnBorrowValidationSchema,
  updateFineValidationSchema,
};