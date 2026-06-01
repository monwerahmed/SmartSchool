import { z } from "zod";
import { ExamType } from "@prisma/client";

/**
 * Create Subject validation (✅ Updated with new fields)
 */
const createSubjectValidationSchema = z.object({
  body: z.object({
    name: z
      .string({
        required_error: "Subject name is required",
      })
      .min(2, "Subject name must be at least 2 characters")
      .max(100, "Subject name cannot exceed 100 characters")
      .trim(),

    code: z
      .string({
        required_error: "Subject code is required",
      })
      .min(2, "Subject code must be at least 2 characters")
      .max(20, "Subject code cannot exceed 20 characters")
      .trim()
      .toUpperCase(),

    defaultTotalMarks: z
      .number()
      .int("Total marks must be an integer")
      .min(1, "Total marks must be at least 1")
      .max(1000, "Total marks cannot exceed 1000")
      .default(100)
      .optional(),

    defaultPassingMarks: z
      .number()
      .int("Passing marks must be an integer")
      .min(0, "Passing marks cannot be negative")
      .max(1000, "Passing marks cannot exceed 1000")
      .default(33)
      .optional(),

    category: z
      .enum([
        "SCIENCE",
        "MATHEMATICS",
        "LANGUAGES",
        "SOCIAL",
        "COMMERCE",
        "ARTS",
        "GENERAL",
        "VOCATIONAL",
        "RELIGIOUS",
      ])
      .default("GENERAL")
      .optional(),

    level: z
      .enum(["PRIMARY", "JUNIOR", "SECONDARY", "HIGHER_SECONDARY"])
      .default("SECONDARY")
      .optional(),

    description: z
      .string()
      .max(500, "Description cannot exceed 500 characters")
      .trim()
      .optional(),

    institutionId: z.string().uuid("Institution ID must be valid UUID").optional(),
  }),
});

/**
 * Create Exam validation (✅ Updated to use classSubjectId)
 */
const createExamValidationSchema = z.object({
  body: z.object({
    name: z
      .string({
        required_error: "Exam name is required",
      })
      .min(3, "Exam name must be at least 3 characters")
      .max(200, "Exam name cannot exceed 200 characters")
      .trim(),

    type: z.nativeEnum(ExamType, {
      required_error: "Exam type is required",
    }),

    academicYear: z
      .number({
        required_error: "Academic year is required",
      })
      .int("Academic year must be an integer")
      .min(2020, "Academic year must be at least 2020")
      .max(2100, "Academic year cannot exceed 2100"),

    sectionIds: z
    .array(z.string().uuid("Each section ID must be a valid UUID"))
    .min(1, "At least one section is required"),

    startDate: z
      .string({
        required_error: "Start date is required",
      })
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),

    endDate: z
      .string({
        required_error: "End date is required",
      })
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),

    // ✅ Changed from subjects to classSubjects
    classSubjects: z
      .array(
        z.object({
          classSubjectId: z
            .string({
              required_error: "Class Subject ID is required",
            })
            .uuid("Class Subject ID must be a valid UUID"),

          totalMarks: z.number().int().min(1).max(1000).optional(),

          passingMarks: z.number().int().min(0).max(1000).optional(),

          examDate: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
            .optional(),
        })
      )
      .min(1, "At least one subject is required")
      .max(20, "Cannot add more than 20 subjects"),
  }),
});

/**
 * Enter single result validation
 */
const enterResultValidationSchema = z.object({
  body: z.object({
    studentId: z
      .string({
        required_error: "Student ID is required",
      })
      .uuid("Student ID must be a valid UUID"),

    examSubjectId: z
      .string({
        required_error: "Exam Subject ID is required",
      })
      .uuid("Exam Subject ID must be a valid UUID"),

    marksObtained: z
      .number({
        required_error: "Marks obtained is required",
      })
      .min(0, "Marks cannot be negative")
      .max(1000, "Marks cannot exceed 1000"),

    remarks: z
      .string()
      .max(500, "Remarks cannot exceed 500 characters")
      .trim()
      .optional(),
  }),
});

/**
 * Bulk result entry validation
 */
const bulkResultValidationSchema = z.object({
  body: z.object({
    examSubjectId: z
      .string({
        required_error: "Exam Subject ID is required",
      })
      .uuid("Exam Subject ID must be a valid UUID"),

    results: z
      .array(
        z.object({
          studentId: z
            .string({
              required_error: "Student ID is required",
            })
            .uuid("Student ID must be a valid UUID"),

          marksObtained: z
            .number({
              required_error: "Marks obtained is required",
            })
            .min(0, "Marks cannot be negative")
            .max(1000, "Marks cannot exceed 1000"),

          remarks: z.string().max(500).trim().optional(),
        })
      )
      .min(1, "At least one result is required")
      .max(100, "Cannot enter more than 100 results at once"),
  }),
});

/**
 * Update result validation
 */
const updateResultValidationSchema = z.object({
  body: z.object({
    marksObtained: z
      .number()
      .min(0, "Marks cannot be negative")
      .max(1000, "Marks cannot exceed 1000")
      .optional(),

    remarks: z
      .string()
      .max(500, "Remarks cannot exceed 500 characters")
      .trim()
      .optional(),
  }),
});

/**
 * Update Exam validation (✅ Handles partial updates and nested classSubjects)
 */
const updateExamValidationSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(3, "Exam name must be at least 3 characters")
      .max(200, "Exam name cannot exceed 200 characters")
      .trim()
      .optional(),

    type: z.nativeEnum(ExamType).optional(),

    academicYear: z
      .number()
      .int()
      .min(2020)
      .max(2100)
      .optional(),

    sectionId: z.string().uuid("Section ID must be a valid UUID").optional(),

    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
      .optional(),

    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
      .optional(),

    institutionId: z.string().uuid().optional(),

    // Update or add subjects nested within the exam
    classSubjects: z
      .array(
        z.object({
          classSubjectId: z
            .string({
              required_error: "Class Subject ID is required",
            })
            .uuid("Class Subject ID must be a valid UUID"),

          totalMarks: z.number().int().min(1).max(1000).optional(),

          passingMarks: z.number().int().min(0).max(1000).optional(),

          examDate: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
            .optional(),
        })
      )
      .max(20, "Cannot add more than 20 subjects")
      .optional(),
  }),
});

// Update your export


export const resultValidation = {
  createSubjectValidationSchema,
  createExamValidationSchema,
  updateExamValidationSchema,
  enterResultValidationSchema,
  bulkResultValidationSchema,
  updateResultValidationSchema,
};