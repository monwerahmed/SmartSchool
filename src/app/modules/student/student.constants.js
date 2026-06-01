import { Gender, BloodGroup, UserStatus } from "@prisma/client";

// Search fields
export const SEARCHABLE_FIELDS = [
  "studentCode",
  "fullNameEnglish",
  "fullNameBangla",
  "phone",
];



// Filter fields
export const FILTERABLE_FIELDS = [
  "gender",
  "bloodGroup",
  "institutionId",
];

// Export Prisma enums for use in validation
export { Gender, BloodGroup, UserStatus };
