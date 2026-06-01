import { Gender, BloodGroup, UserStatus } from "@prisma/client";


// Search fields
export const SEARCHABLE_FIELDS = [
  "teacherCode",
  "fullNameEnglish",
  "fullNameBangla",
  "phone",
  "email",
  "nid",
];

// Filter fields
export const FILTERABLE_FIELDS = [
  "gender",
  "bloodGroup",
  "department",
  "designation",
  "institutionId",
];

// Export Prisma enums
export { Gender, BloodGroup, UserStatus };