// Grade configuration for Bangladesh education system
export const GRADE_CONFIG = [
  { min: 80, max: 100, grade: "A+", gpa: 5.0 },
  { min: 70, max: 79, grade: "A", gpa: 4.0 },
  { min: 60, max: 69, grade: "A-", gpa: 3.5 },
  { min: 50, max: 59, grade: "B", gpa: 3.0 },
  { min: 40, max: 49, grade: "C", gpa: 2.0 },
  { min: 33, max: 39, grade: "D", gpa: 1.0 },
  { min: 0, max: 32, grade: "F", gpa: 0.0 },
];

// Exam types
export const EXAM_TYPES = {
  CLASS_TEST: "CLASS_TEST",
  MIDTERM: "MIDTERM",
  FINAL: "FINAL",
  TERM_END: "TERM_END",
  WEEKLY_TEST: "WEEKLY_TEST",
};

// Default marks
export const DEFAULT_TOTAL_MARKS = 100;
export const DEFAULT_PASSING_MARKS = 33;