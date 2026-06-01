import { z } from "zod";

/**
 * Validation for creating user
 */

const createUserValidationSchema = z.object({
  body: z.object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(30, "Username cannot exceed 30 characters")
      .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, underscore allowed"),

    email: z
      .string()
      .email("Invalid email format")
      .toLowerCase(),

    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .max(100, "Password too long")
      .regex(
        /^(?=.*[A-Za-z])(?=.*\d)/,
        "Password must contain at least one letter and one number"
      ),
  }),
});

/**
 * Validation for creating super admin
 */

const createSuperAdminValidationSchema = z.object({
  body: z.object({
    username: z
      .string({
        required_error: "Username is required",
      })
      .min(3, "Username must be at least 3 characters long"),

    email: z
      .string({
        required_error: "Email is required",
      })
      .email("Please provide a valid email address"),

    password: z.string().min(6, "Password must be at least 6 characters long"),
  }),
});

/**
 * Validation for creating Admin
 * Required: username, email, password, institutionId
 */
const createAdminValidationSchema = z.object({
  body: z.object({
    username: z
      .string({
        required_error: "Username is required",
      })
      .min(3, "Username must be at least 3 characters long")
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
      .min(6, "Password must be at least 6 characters long")
      .max(50, "Password cannot exceed 50 characters"),

    institutionId: z
      .string({
        required_error: "Institution ID is required",
      })
      .uuid("Institution ID must be a valid UUID"),
  }),
});

/**
 * Validation for creating Principal
 * institutionId is optional (auto-filled from logged-in user)
 */
const createPrincipalValidationSchema = z.object({
  body: z.object({
    username: z
      .string({
        required_error: "Username is required",
      })
      .min(3, "Username must be at least 3 characters long")
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
      .min(6, "Password must be at least 6 characters long")
      .max(50, "Password cannot exceed 50 characters"),

    institutionId: z
      .string()
      .uuid("Institution ID must be a valid UUID")
      .optional(), // Optional - will use logged-in user's institution if not provided
  }),
});

export const userValidation = {
  createSuperAdminValidationSchema,
  createAdminValidationSchema,
  createPrincipalValidationSchema,
  createUserValidationSchema
};
