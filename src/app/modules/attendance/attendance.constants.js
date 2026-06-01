import { AttendanceStatus } from "@prisma/client";

// How many days back can attendance be marked
export const ALLOWED_DAYS_BACK = 7;

// Weekend days (Bangladesh: Friday = 5, Saturday = 6)
export const WEEKEND_DAYS = [5, 6];


// Export Prisma enum
export { AttendanceStatus };


