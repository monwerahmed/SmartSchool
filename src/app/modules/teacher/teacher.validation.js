import { z } from "zod";
import { Gender, BloodGroup, UserStatus } from "@prisma/client";

// Bangladesh phone number regex
const phoneRegex = /^01[3-9]\d{8}$/;

// Bangladesh NID regex (10 or 13 or 17 digits)
const nidRegex = /^\d{10}$|^\d{13}$|^\d{17}$/;

/**
 * Validation for creating teacher
 */

const createTeacherValidationSchema = z.object({
  body: z.object({
    // ========================================
    // USER DATA (for authentication)
    // ========================================
    username: z
      .string({
        required_error: "Username is required",
      })
      .min(3, "Username must be at least 3 characters")
      .max(20, "Username cannot exceed 20 characters")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers, and underscores",
      )
      .trim(),

    email: z
      .string({
        required_error: "Email is required",
      })
      .email("Please provide a valid email address")
      .toLowerCase()
      .trim(),

    password: z
      .string({
        required_error: "Password is required",
      })
      .min(6, "Password must be at least 6 characters")
      .max(50, "Password cannot exceed 50 characters"),

    // ========================================
    // TEACHER PROFILE DATA
    // ========================================
    teacherCode: z
      .string({
        required_error: "Teacher code is required",
      })
      .min(3, "Teacher code must be at least 3 characters")
      .max(20, "Teacher code cannot exceed 20 characters")
      .trim(),

    fullNameEnglish: z
      .string({
        required_error: "Full name in English is required",
      })
      .min(3, "Name must be at least 3 characters")
      .max(100, "Name cannot exceed 100 characters")
      .trim(),

    fullNameBangla: z
      .string()
      .min(3, "Name must be at least 3 characters")
      .max(100, "Name cannot exceed 100 characters")
      .trim()
      .optional(),

    dateOfBirth: z
      .string()
      .refine((date) => {
        const dob = new Date(date);
        const today = new Date();
        return dob < today;
      }, "Date of birth must be in the past")
      .refine((date) => {
        const dob = new Date(date);
        const age =
          (new Date().getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365);
        return age >= 22 && age <= 70;
      }, "Teacher age must be between 22 and 70 years")
      .optional(),

    gender: z.nativeEnum(Gender, {
      required_error: "Gender is required",
      errorMap: () => ({
        message: "Gender must be MALE, FEMALE, or OTHER",
      }),
    }),

    bloodGroup: z
      .nativeEnum(BloodGroup, {
        errorMap: () => ({
          message:
            "Invalid blood group. Must be A+, A-, B+, B-, AB+, AB-, O+, or O-",
        }),
      })
      .optional(),

    // Professional Info
    qualification: z
      .string()
      .max(200, "Qualification cannot exceed 200 characters")
      .trim()
      .optional(),

    department: z
      .string()
      .max(100, "Department cannot exceed 100 characters")
      .trim()
      .optional(),

    designation: z
      .string()
      .max(100, "Designation cannot exceed 100 characters")
      .trim()
      .optional(),

    subject: z
      .string()
      .max(100, "Subject cannot exceed 100 characters")
      .trim()
      .optional(),

    joiningDate: z
      .string()
      .refine((date) => {
        const joining = new Date(date);
        const today = new Date();
        return joining <= today;
      }, "Joining date cannot be in the future")
      .optional(),

    // Contact Info
    phone: z
      .string()
      .regex(
        phoneRegex,
        "Phone must be a valid Bangladesh number (format: 01XXXXXXXXX)",
      )
      .optional(),

    // Professional email (different from login email)
    teacherEmail: z
      .string()
      .email("Please provide a valid email address")
      .toLowerCase()
      .trim()
      .optional(),

    address: z
      .string()
      .max(500, "Address cannot exceed 500 characters")
      .trim()
      .optional(),

    nid: z
      .string()
      .regex(
        nidRegex,
        "NID must be 10, 13, or 17 digits (Bangladesh National ID format)",
      )
      .trim()
      .optional(),

    // Salary (sensitive)
    salary: z
      .number()
      .positive("Salary must be a positive number")
      .max(10000000, "Salary cannot exceed 10,000,000")
      .optional(),
  }),
});

/**
 * Validation for updating teacher profile
 */

const updateTeacherValidationSchema = z.object({
  body: z.object({
    fullNameEnglish: z
      .string()
      .min(3, "Name must be at least 3 characters")
      .max(100, "Name cannot exceed 100 characters")
      .trim()
      .optional(),

    fullNameBangla: z
      .string()
      .min(3, "Name must be at least 3 characters")
      .max(100, "Name cannot exceed 100 characters")
      .trim()
      .optional(),

    // Cannot change after creation
    teacherCode: z
      .never({
        errorMap: () => ({
          message: "Teacher code cannot be changed after creation",
        }),
      })
      .optional(),

    gender: z
      .never({
        errorMap: () => ({
          message: "Gender cannot be changed after creation",
        }),
      })
      .optional(),

    nid: z
      .never({
        errorMap: () => ({
          message: "NID cannot be changed after creation for security reasons",
        }),
      })
      .optional(),

    dateOfBirth: z
      .string()
      .refine((date) => {
        const dob = new Date(date);
        const today = new Date();
        return dob < today;
      }, "Date of birth must be in the past")
      .refine((date) => {
        const dob = new Date(date);
        const age =
          (new Date().getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365);
        return age >= 22 && age <= 70;
      }, "Teacher age must be between 22 and 70 years")
      .optional(),

    bloodGroup: z
      .nativeEnum(BloodGroup, {
        errorMap: () => ({
          message: "Invalid blood group",
        }),
      })
      .optional(),

    qualification: z
      .string()
      .max(200, "Qualification cannot exceed 200 characters")
      .trim()
      .optional(),

    department: z
      .string()
      .max(100, "Department cannot exceed 100 characters")
      .trim()
      .optional(),

    designation: z
      .string()
      .max(100, "Designation cannot exceed 100 characters")
      .trim()
      .optional(),

    subject: z
      .string()
      .max(100, "Subject cannot exceed 100 characters")
      .trim()
      .optional(),

    joiningDate: z
      .string()
      .refine((date) => {
        const joining = new Date(date);
        const today = new Date();
        return joining <= today;
      }, "Joining date cannot be in the future")
      .optional(),

    phone: z
      .string()
      .regex(phoneRegex, "Phone must be a valid Bangladesh number")
      .optional(),

    teacherEmail: z
      .string()
      .email("Please provide a valid email address")
      .toLowerCase()
      .trim()
      .optional(),

    address: z
      .string()
      .max(500, "Address cannot exceed 500 characters")
      .trim()
      .optional(),

    salary: z
      .number()
      .positive("Salary must be a positive number")
      .max(10000000, "Salary cannot exceed 10,000,000")
      .optional(),
  }),
});

/**
 * Validation for changing teacher status
 */
const changeStatusValidationSchema = z.object({
  body: z.object({
    status: z.nativeEnum(UserStatus, {
      required_error: "Status is required",
      errorMap: () => ({
        message: "Status must be ACTIVE, INACTIVE, SUSPENDED, or BLOCKED",
      }),
    }),
  }),
});


export const teacherValidation = {
  createTeacherValidationSchema,
  updateTeacherValidationSchema,
  changeStatusValidationSchema
};
