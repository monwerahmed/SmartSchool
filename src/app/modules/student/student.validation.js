import { BloodGroup, Gender, UserStatus } from "@prisma/client";
import { z } from "zod";

// Bangladesh phone number regex
const phoneRegex = /^01[3-9]\d{8}$/;

/**
 * Validation for creating student
 *
 * Includes both User data and Student profile data
 */

const createStudentValidationSchema = z.object({
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
    // STUDENT PROFILE DATA
    // ========================================
    studentCode: z
      .string({
        required_error: "Student code is required",
      })
      .min(3, "Student code must be at least 3 characters")
      .max(20, "Student code cannot exceed 20 characters")
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
      .string({
        required_error: "Date of birth is required",
      })
      .refine((date) => {
        const dob = new Date(date);
        const today = new Date();
        return dob < today;
      }, "Date of birth must be in the past")
      .refine((date) => {
        const dob = new Date(date);
        const age =
          (new Date().getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365);
        return age >= 5 && age <= 25;
      }, "Student age must be between 3 and 25 years"),

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

    phone: z
      .string()
      .regex(
        phoneRegex,
        "Phone must be a valid Bangladesh number (format: 01XXXXXXXXX)",
      )
      .optional(),

    address: z
      .string()
      .max(500, "Address cannot exceed 500 characters")
      .trim()
      .optional(),

    // institutionId is auto-filled from token, not from body
  }),
});

/**
 * Validation for updating student profile
 *
 * Only allows updating specific fields
 */

const updateStudentValidationSchema = z.object({
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
    studentCode: z
      .never({
        errorMap: () => ({
          message: "Student code cannot be changed after creation",
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
        return age >= 5 && age <= 25;
      }, "Student age must be between 5 and 25 years")
      .optional(),

    gender: z
      .string()
      .optional(),

    bloodGroup: z
      .nativeEnum(BloodGroup, {
        errorMap: () => ({
          message: "Invalid blood group",
        }),
      })
      .optional(),

    phone: z
      .string()
      .regex(phoneRegex, "Phone must be a valid Bangladesh number")
      .optional(),

    address: z
      .string()
      .max(500, "Address cannot exceed 500 characters")
      .trim()
      .optional(),
  }),
});

/**
 * Validation for changing student status
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

/**
 * Validation for enrolling student in a section
 */

const enrollStudentValidationSchema = z.object({
  body: z.object({
    sectionId: z
      .string({
        required_error: "Section ID is required",
      })
      .uuid("Section ID must be a valid UUID"),

    academicYear: z
      .number({
        required_error: "Academic year is required",
        invalid_type_error: "Academic year must be a number",
      })
      .int("Academic year must be an integer")
      .min(2000, "Academic year cannot be before 2000")
      .max(2100, "Academic year cannot be after 2100"),

    rollNumber: z
      .string()
      .min(1, "Roll number must be at least 1 character")
      .max(10, "Roll number cannot exceed 10 characters")
      .trim()
      .optional(),
  }),
});

/**
 * Validation for updating enrollment status
 */

const updateEnrollmentStatusValidationSchema = z.object({
  body: z.object({
    status: z.enum(["ACTIVE", "TRANSFERRED", "PASSED", "DROPPED"], {
      required_error: "Status is required",
      errorMap: () => ({
        message: "Status must be ACTIVE, TRANSFERRED, PASSED, or DROPPED",
      }),
    }),
  }),
});

export const studentValidation = {
  createStudentValidationSchema,
  updateStudentValidationSchema,
  changeStatusValidationSchema,
  enrollStudentValidationSchema,
  updateEnrollmentStatusValidationSchema,
};
