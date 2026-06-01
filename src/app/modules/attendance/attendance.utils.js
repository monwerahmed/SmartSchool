import { ALLOWED_DAYS_BACK, WEEKEND_DAYS } from "./attendance.constants.js";

/**
 * Check if date is in the future
 */

export const isFutureDate = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);

  return checkDate > today;
};

/**
 * Check if date is a weekend
 */

export const isWeekend = (date) => {
  const dayOfWeek = new Date(date).getDay();
  return WEEKEND_DAYS.includes(dayOfWeek);
};

/**
 * Check if date is within allowed range (not too old)
 */

export const isWithinAllowedRange = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);

  const diffTime = today - checkDate;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays <= ALLOWED_DAYS_BACK;
};

/**
 * Validate attendance date
 */

export const validateAttendanceDate = (date) => {
  if (isFutureDate(date)) {
    return {
      valid: false,
      message: "Cannot mark attendance for future dates",
    };
  }

  if (!isWithinAllowedRange(date)) {
    return {
      valid: false,
      message: `Cannot mark attendance for dates older than ${ALLOWED_DAYS_BACK} days`,
    };
  }

  if (isWeekend(date)) {
    return {
      valid: false,
      message: "Cannot mark attendance on weekends (Friday/Saturday)",
    };
  }
  return { valid: true };
};

/**
 * Calculate attendance percentage
 */

export const calculatePercentage = (present, total) => {
  if (total === 0) return 0;
  const percentage = (present / total) * 100;
  return Math.round(percentage * 100) / 100;
};

/**
 * Get attendance status category
 */

export const getAttendanceStatusCategory = (percentage) => {
  if (percentage >= 75) return "GOOD";
  if (percentage >= 50) return "Warning";

  return "Critical";
};

/**
 * Format date to YYYY-MM-DD
 */

export const formatDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
