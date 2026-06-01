import { z } from "zod";

/**
 * Create Academic Class validation
 */
const createAcademicClassValidationSchema = z.object({
  body: z.object({
    name: z
      .string({
        required_error: "Class name is required",
      })
      .min(2, "Class name must be at least 2 characters")
      .max(50, "Class name cannot exceed 50 characters")
      .trim(),

    academicYear: z
      .number({
        required_error: "Academic year is required",
      })
      .int("Academic year must be an integer")
      .min(2020, "Academic year must be at least 2020")
      .max(2100, "Academic year cannot exceed 2100"),

    institutionId: z
      .string()
      .uuid("Institution ID must be a valid UUID")
      .optional(),
  }),
});

/**
 * Update Academic Class validation
 */
const updateAcademicClassValidationSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, "Class name must be at least 2 characters")
      .max(50, "Class name cannot exceed 50 characters")
      .trim()
      .optional(),

    academicYear: z
      .number()
      .int("Academic year must be an integer")
      .min(2020, "Academic year must be at least 2020")
      .max(2100, "Academic year cannot exceed 2100")
      .optional(),
  }),
});

/**
 * Assign subjects to class validation (✅ NEW)
 */
const assignSubjectsValidationSchema = z.object({
  body: z.object({
    subjects: z
      .array(
        z.object({
          subjectId: z
            .string({
              required_error: "Subject ID is required",
            })
            .uuid("Subject ID must be a valid UUID"),

          totalMarks: z
            .number()
            .int("Total marks must be an integer")
            .min(1, "Total marks must be at least 1")
            .max(1000, "Total marks cannot exceed 1000")
            .optional(),

          passingMarks: z
            .number()
            .int("Passing marks must be an integer")
            .min(0, "Passing marks cannot be negative")
            .max(1000, "Passing marks cannot exceed 1000")
            .optional(),

          isCompulsory: z.boolean().optional(),

          teacherId: z
            .string()
            .uuid("Teacher ID must be valid UUID")
            .optional(),
        }),
      )
      .min(1, "At least one subject is required")
      .max(20, "Cannot assign more than 20 subjects at once"),
  }),
});

/**
 * Update class-subject validation (✅ NEW)
 */
const updateClassSubjectValidationSchema = z.object({
  body: z.object({
    totalMarks: z
      .number()
      .int("Total marks must be an integer")
      .min(1, "Total marks must be at least 1")
      .max(1000, "Total marks cannot exceed 1000")
      .optional(),

    passingMarks: z
      .number()
      .int("Passing marks must be an integer")
      .min(0, "Passing marks cannot be negative")
      .max(1000, "Passing marks cannot exceed 1000")
      .optional(),

    isCompulsory: z.boolean().optional(),

    teacherId: z
      .string()
      .uuid("Teacher ID must be valid UUID")
      .nullable()
      .optional(),
  }),
});

/**
 * Assign teacher validation
 */
const assignTeacherValidationSchema = z.object({
  body: z.object({
    teacherId: z
      .string({
        required_error: "Teacher ID is required",
      })
      .uuid("Teacher ID must be a valid UUID"),
  }),
});

export const academicClassValidation = {
  createAcademicClassValidationSchema,
  updateAcademicClassValidationSchema,
  assignSubjectsValidationSchema,
  updateClassSubjectValidationSchema,
  assignTeacherValidationSchema,
};
