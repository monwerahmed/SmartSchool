import { z } from "zod";
import { AttendanceStatus } from "@prisma/client";

/**
 * Validation for marking single attendance
 */

const markAttendanceValidationSchema = z.object({
  body: z.object({
    studentId: z
      .string({
        required_error: "Student ID is required",
      })
      .uuid("Student ID must be a valid UUID"),

    date: z
      .string({
        required_error: "Date is required",
      })
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),

    status: z.nativeEnum(AttendanceStatus, {
      required_error: "Status is required",
      errorMap: () => ({
        message: "Status must be PRESENT, ABSENT, LATE, or LEAVE",
      }),
    }),

    remarks: z
      .string()
      .max(500, "Remarks cannot exceed 500 characters")
      .trim()
      .optional(),
  }),
});

/**
 * Validation for bulk attendance marking
 */
const bulkAttendanceValidationSchema = z.object({
  body: z.object({
    sectionId: z
      .string({
        required_error: "Section ID is required",
      })
      .uuid("Section ID must be a valid UUID"),

    date: z
      .string({
        required_error: "Date is required",
      })
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),

    attendances: z
      .array(
        z.object({
          studentId: z
            .string({
              required_error: "Student ID is required",
            })
            .uuid("Student ID must be a valid UUID"),

          status: z.nativeEnum(AttendanceStatus, {
            required_error: "Status is required",
          }),

          remarks: z.string().max(500).trim().optional(),
        }),
      )
      .min(1, "At least one attendance record is required")
      .max(100, "Cannot mark more than 100 students at once"),
  }),
});

/**
 * Validation for updating attendance
 */
const updateAttendanceValidationSchema = z.object({
  body: z.object({
    status: z
      .nativeEnum(AttendanceStatus, {
        errorMap: () => ({
          message: "Status must be PRESENT, ABSENT, LATE, or LEAVE",
        }),
      })
      .optional(),

    remarks: z
      .string()
      .max(500, "Remarks cannot exceed 500 characters")
      .trim()
      .optional(),
  }),
});

/**
 * Validation for getting attendance history
 */
const getHistoryValidationSchema = z.object({
  query: z.object({
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
      .optional(),

    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
      .optional(),

    month: z
      .string()
      .regex(/^\d{1,2}$/, "Month must be 1-12")
      .optional(),

    year: z
      .string()
      .regex(/^\d{4}$/, "Year must be 4 digits")
      .optional(),
  }),
});

export const attendanceValidation = {
  markAttendanceValidationSchema,
  bulkAttendanceValidationSchema,
  updateAttendanceValidationSchema,
  getHistoryValidationSchema,
};
