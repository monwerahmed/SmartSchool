import { z } from "zod";
import { RelationshipType, UserStatus } from "@prisma/client";

// Bangladesh phone number regex
const phoneRegex = /^01[3-9]\d{8}$/;

// Bangladesh NID regex (10 or 13 or 17 digits)
const nidRegex = /^\d{10}$|^\d{13}$|^\d{17}$/;

/**
 * Validation for creating guardian
 */
const createGuardianValidationSchema = z.object({
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
        "Username can only contain letters, numbers, and underscores"
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
    // GUARDIAN PROFILE DATA
    // ========================================
    guardianCode: z
      .string({
        required_error: "Guardian code is required",
      })
      .min(3, "Guardian code must be at least 3 characters")
      .max(20, "Guardian code cannot exceed 20 characters")
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

    // Phone is REQUIRED for guardians (emergency contact)
    phone: z
      .string({
        required_error: "Phone number is required for guardians",
      })
      .regex(
        phoneRegex,
        "Phone must be a valid Bangladesh number (format: 01XXXXXXXXX)"
      ),

    // Professional email (different from login email)
    guardianEmail: z
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
        "NID must be 10, 13, or 17 digits (Bangladesh National ID format)"
      )
      .trim()
      .optional(),

    occupation: z
      .string()
      .max(100, "Occupation cannot exceed 100 characters")
      .trim()
      .optional(),

    monthlyIncome: z
      .number()
      .positive("Monthly income must be a positive number")
      .max(100000000, "Monthly income cannot exceed 100,000,000")
      .optional(),
  }),
});

/**
 * Validation for updating guardian profile
 */
const updateGuardianValidationSchema = z.object({
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
    guardianCode: z
      .never({
        errorMap: () => ({
          message: "Guardian code cannot be changed after creation",
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

    phone: z
      .string()
      .regex(phoneRegex, "Phone must be a valid Bangladesh number")
      .optional(),

    guardianEmail: z
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

    occupation: z
      .string()
      .max(100, "Occupation cannot exceed 100 characters")
      .trim()
      .optional(),

    monthlyIncome: z
      .number()
      .positive("Monthly income must be a positive number")
      .max(100000000, "Monthly income cannot exceed 100,000,000")
      .optional(),
  }),
});

/**
 * Validation for changing guardian status
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
 * Validation for linking guardian to student
 */
const linkStudentValidationSchema = z.object({
  body: z.object({
    studentId: z
      .string({
        required_error: "Student ID is required",
      })
      .uuid("Student ID must be a valid UUID"),

    relationship: z.nativeEnum(RelationshipType, {
      required_error: "Relationship is required",
      errorMap: () => ({
        message:
          "Relationship must be FATHER, MOTHER, UNCLE, AUNT, GRANDFATHER, GRANDMOTHER, LEGAL_GUARDIAN, or OTHER",
      }),
    }),

    isPrimary: z
      .boolean({
        invalid_type_error: "isPrimary must be a boolean",
      })
      .default(false),
  }),
});

/**
 * Validation for updating guardian-student link
 */
const updateLinkValidationSchema = z.object({
  body: z.object({
    relationship: z
      .nativeEnum(RelationshipType, {
        errorMap: () => ({
          message: "Invalid relationship type",
        }),
      })
      .optional(),

    isPrimary: z
      .boolean({
        invalid_type_error: "isPrimary must be a boolean",
      })
      .optional(),
  }),
});

export const guardianValidation = {
  createGuardianValidationSchema,
  updateGuardianValidationSchema,
  changeStatusValidationSchema,
  linkStudentValidationSchema,
  updateLinkValidationSchema,
};