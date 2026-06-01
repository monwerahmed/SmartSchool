import { GRADE_CONFIG } from "./result.constants.js";

/**
 * Calculate grade and GPA based on marks
 * @param {number} marksObtained - Marks obtained by student
 * @param {number} totalMarks - Total marks of the subject
 * @returns {Object} - { grade, gpa }
 */
export const calculateGrade = (marksObtained, totalMarks) => {
  const percentage = (marksObtained / totalMarks) * 100;

  for (const config of GRADE_CONFIG) {
    if (percentage >= config.min && percentage <= config.max) {
      return {
        grade: config.grade,
        gpa: config.gpa,
      };
    }
  }

  return { grade: "F", gpa: 0.0 };
};

/**
 * Validate marks
 * @param {number} marksObtained - Marks to validate
 * @param {number} totalMarks - Total marks
 * @param {number} passingMarks - Passing marks
 * @returns {Object} - { valid, message }
 */
export const validateMarks = (marksObtained, totalMarks, passingMarks) => {
  if (marksObtained < 0) {
    return { valid: false, message: "Marks cannot be negative" };
  }

  if (marksObtained > totalMarks) {
    return {
      valid: false,
      message: `Marks obtained (${marksObtained}) cannot exceed total marks (${totalMarks})`,
    };
  }

  return { valid: true };
};

/**
 * Calculate overall result from subject results
 * @param {Array} subjectResults - Array of subject results with grade and gpa
 * @returns {Object} - { totalGPA, averageGPA, overallGrade, status, failedSubjects }
 */
export const calculateOverallResult = (subjectResults) => {
  console.log(subjectResults);
  let totalGPA = 0;
  const failedSubjects = [];

  // Check for failures
  for (const result of subjectResults) {
    if (result.grade === "F") {
      failedSubjects.push(result.subjectName);
    }
    totalGPA += result.gpa;
  }

  // If any subject is F, overall result is FAIL
  if (failedSubjects.length > 0) {
    return {
      totalGPA: 0,
      averageGPA: 0,
      overallGrade: "F",
      status: "FAIL",
      failedSubjects,
    };
  }

  const averageGPA = totalGPA / subjectResults.length;

  // Determine overall grade based on average GPA
  let overallGrade = "F";
  for (const config of GRADE_CONFIG) {
    // Convert GPA back to percentage for grade calculation
    const percentageEquivalent = (averageGPA / 5.0) * 100;
    if (
      percentageEquivalent >= config.min &&
      percentageEquivalent <= config.max
    ) {
      overallGrade = config.grade;
      break;
    }
  }

  return {
    totalGPA: parseFloat(totalGPA.toFixed(2)),
    averageGPA: parseFloat(averageGPA.toFixed(2)),
    overallGrade,
    status: "PASS",
    failedSubjects: [],
  };
};

/**
 * Format result statistics
 * @param {Array} results - Array of result objects
 * @returns {Object} - Statistics object
 */
export const formatResultStatistics = (results) => {
  if (results.length === 0) {
    return {
      totalStudents: 0,
      highestMarks: 0,
      lowestMarks: 0,
      averageMarks: 0,
      passCount: 0,
      failCount: 0,
      passPercentage: 0,
    };
  }

  const marks = results.map((r) => r.marksObtained);
  const highest = Math.max(...marks);
  const lowest = Math.min(...marks);
  const average = marks.reduce((a, b) => a + b, 0) / marks.length;
  const passCount = results.filter((r) => r.grade !== "F").length;
  const failCount = results.length - passCount;

  return {
    totalStudents: results.length,
    highestMarks: highest,
    lowestMarks: lowest,
    averageMarks: parseFloat(average.toFixed(2)),
    passCount,
    failCount,
    passPercentage: parseFloat(((passCount / results.length) * 100).toFixed(2)),
  };
};

/**
 * Calculate percentage
 * @param {number} obtained - Marks obtained
 * @param {number} total - Total marks
 * @returns {number} - Percentage
 */
export const calculatePercentage = (obtained, total) => {
  if (total === 0) return 0;
  return parseFloat(((obtained / total) * 100).toFixed(2));
};