import { SectionShift } from "@prisma/client";
import { z } from "zod";

/**
 * Validation for creating section
 */

const createSectionValidationSchema = z.object({
  body: z.object({
    name: z
      .string({
        required_error: "Section name is required",
      })
      .min(1, "Section name must be at least 1 character")
      .max(20, "Section name cannot exceed 20 characters")
      .trim(),

    classId: z
      .string({
        required_error: "Class ID is required",
      })
      .uuid("Class ID must be a valid UUID"),

    shift: z
      .nativeEnum(SectionShift, {
        required_error: "Shift is required",
        errorMap: () => ({
          message: "Shift must be MORNING, DAY, or EVENING",
        }),
      })
      .default("MORNING"),

    capacity: z
      .number()
      .int("Capacity must be an integer")
      .min(1, "Capacity must be at least 1")
      .max(100, "Capacity cannot exceed 100")
      .default(40)
      .optional(),
  }),
});

/**
 * Validation for updating section
 */

const updateSectionValidationSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(1, "Section name must be at least 1 character")
      .max(20, "Section name cannot exceed 20 characters")
      .trim()
      .optional(),

    // classId cannot be changed
    classId: z
      .never({
        errorMap: () => ({
          message: "Class ID cannot be changed after creation",
        }),
      })
      .optional(),

    shift: z
      .nativeEnum(SectionShift, {
        errorMap: () => ({
          message: "Shift must be MORNING, DAY, or EVENING",
        }),
      })
      .optional(),

    capacity: z
      .number()
      .int("Capacity must be an integer")
      .min(1, "Capacity must be at least 1")
      .max(100, "Capacity cannot exceed 100")
      .optional(),
  }),
});

export const sectionValidation = {
  createSectionValidationSchema,
  updateSectionValidationSchema,
};
