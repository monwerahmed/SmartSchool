// import { z } from "zod";
// import { INSTITUTION_TYPES } from "./institution.constants.js";
// import { InstitutionStatus } from "@prisma/client";

// // Phone number validation (Bangladesh format)
// const phoneRegex = /^01[3-9]\d{8}$/;

// // EIIN validation (6 digits)
// const eiinRegex = /^\d{6}$/;

// // Code validation (alphanumeric, 3-20 chars)
// const codeRegex = /^[A-Z0-9_-]{3,20}$/i;

// const createInstitutionValidationSchema = z.object({
//   body: z.object({
//     name: z
//       .string({
//         required_error: "Institution name is required",
//       })
//       .min(3, "Name must be at least 3 characters long")
//       .max(200, "Name cannot exceed 200 characters")
//       .trim(),

//     code: z
//       .string({
//         required_error: "Institution code is required",
//       })
//       .regex(codeRegex, "Code must be 3-20 alphanumeric characters")
//       .toUpperCase()
//       .trim(),

//     eiin: z
//       .string()
//       .regex(eiinRegex, "EIIN must be exactly 6 digits")
//       .optional()
//       .nullable(),

//     type: z
//       .enum(INSTITUTION_TYPES, {
//         errorMap: () => ({
//           message: `Type must be one of: ${INSTITUTION_TYPES.join(", ")}`,
//         }),
//       })
//       .optional()
//       .nullable(),

//     email: z
//       .string()
//       .email("Please provide a valid email address")
//       .toLowerCase()
//       .optional()
//       .nullable(),

//     phone: z
//       .string()
//       .regex(phoneRegex, "Phone must be valid Bangladesh number (01XXXXXXXXX)")
//       .optional()
//       .nullable(),

//     address: z
//       .string()
//       .max(500, "Address cannot exceed 500 characters")
//       .optional()
//       .nullable(),
//   }),
// });

// const updateInstitutionValidationSchema = z.object({
//   body: z.object({
//     name: z
//       .string()
//       .min(3, "Name must be at least 3 characters long")
//       .max(200, "Name cannot exceed 200 characters")
//       .trim()
//       .optional(),

//     code: z
//       .never({
//         errorMap: () => ({
//           message: "Institution code cannot be changed",
//         }),
//       })
//       .optional(),

//     eiin: z
//       .string()
//       .regex(eiinRegex, "EIIN must be exactly 6 digits")
//       .optional()
//       .nullable(),

//     type: z
//       .enum(INSTITUTION_TYPES, {
//         errorMap: () => ({
//           message: `Type must be one of: ${INSTITUTION_TYPES.join(", ")}`,
//         }),
//       })
//       .optional()
//       .nullable(),

//     email: z
//       .string()
//       .email("Please provide a valid email address")
//       .toLowerCase()
//       .optional()
//       .nullable(),

//     phone: z
//       .string()
//       .regex(phoneRegex, "Phone must be valid Bangladesh number (01XXXXXXXXX)")
//       .optional()
//       .nullable(),

//     address: z
//       .string()
//       .max(500, "Address cannot exceed 500 characters")
//       .optional()
//       .nullable(),
//   }),
// });

// const changeStatusValidationSchema = z.object({
//   body: z.object({
//     status: z.nativeEnum(InstitutionStatus, {
//       required_error: "Status is required",
//       errorMap: () => ({
//         message: "Status must be ACTIVE, INACTIVE, or SUSPENDED",
//       }),
//     }),
//   }),
// });

// export const institutionValidation = {
//   createInstitutionValidationSchema,
//   updateInstitutionValidationSchema,
//   changeStatusValidationSchema,
// };


import { z } from "zod";
import { InstitutionStatus } from "@prisma/client";
import { INSTITUTION_TYPES } from "./institution.constants.js";

// Bangladesh phone number validation (01XXXXXXXXX format)
const phoneRegex = /^01[3-9]\d{8}$/;

// EIIN validation (exactly 6 digits)
const eiinRegex = /^\d{6}$/;

// Institution code validation (alphanumeric with _ or -, 3-20 characters)
const codeRegex = /^[A-Z0-9_-]{3,20}$/i;

/**
 * Validation schema for creating institution
 */
const createInstitutionValidationSchema = z.object({
  body: z.object({
    name: z
      .string({
        required_error: "Institution name is required",
      })
      .min(3, "Name must be at least 3 characters long")
      .max(200, "Name cannot exceed 200 characters")
      .trim(),

    code: z
      .string({
        required_error: "Institution code is required",
      })
      .regex(codeRegex, "Code must be 3-20 alphanumeric characters (can include _ or -)")
      .toUpperCase()
      .trim(),

    eiin: z
      .string()
      .regex(eiinRegex, "EIIN must be exactly 6 digits")
      .optional()
      .nullable(),

    type: z
      .enum(INSTITUTION_TYPES, {
        errorMap: () => ({
          message: `Type must be one of: ${INSTITUTION_TYPES.join(", ")}`,
        }),
      })
      .optional()
      .nullable(),

    email: z
      .string()
      .email("Please provide a valid email address")
      .toLowerCase()
      .optional()
      .nullable(),

    phone: z
      .string()
      .regex(
        phoneRegex,
        "Phone must be a valid Bangladesh number (format: 01XXXXXXXXX)"
      )
      .optional()
      .nullable(),

    address: z
      .string()
      .max(500, "Address cannot exceed 500 characters")
      .trim()
      .optional()
      .nullable(),
  }),
});

/**
 * Validation schema for updating institution
 * Note: Code cannot be updated once created
 */
const updateInstitutionValidationSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(3, "Name must be at least 3 characters long")
      .max(200, "Name cannot exceed 200 characters")
      .trim()
      .optional(),

    // Code field is not allowed in update
    code: z
      .never({
        errorMap: () => ({
          message: "Institution code cannot be changed after creation",
        }),
      })
      .optional(),

    eiin: z
      .string()
      .regex(eiinRegex, "EIIN must be exactly 6 digits")
      .optional()
      .nullable(),

    type: z
      .enum(INSTITUTION_TYPES, {
        errorMap: () => ({
          message: `Type must be one of: ${INSTITUTION_TYPES.join(", ")}`,
        }),
      })
      .optional()
      .nullable(),

    email: z
      .string()
      .email("Please provide a valid email address")
      .toLowerCase()
      .optional()
      .nullable(),

    phone: z
      .string()
      .regex(
        phoneRegex,
        "Phone must be a valid Bangladesh number (format: 01XXXXXXXXX)"
      )
      .optional()
      .nullable(),

    address: z
      .string()
      .max(500, "Address cannot exceed 500 characters")
      .trim()
      .optional()
      .nullable(),
  }),
});

/**
 * Validation schema for changing institution status
 */
const changeStatusValidationSchema = z.object({
  body: z.object({
    status: z.nativeEnum(InstitutionStatus, {
      required_error: "Status is required",
      errorMap: () => ({
        message: "Status must be ACTIVE, INACTIVE, or SUSPENDED",
      }),
    }),
  }),
});

export const institutionValidation = {
  createInstitutionValidationSchema,
  updateInstitutionValidationSchema,
  changeStatusValidationSchema,
};