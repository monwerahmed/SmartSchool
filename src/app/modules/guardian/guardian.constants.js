import { RelationshipType, UserStatus } from "@prisma/client";


// Search fields
export const SEARCHABLE_FIELDS = [
  "guardianCode",
  "fullNameEnglish",
  "fullNameBangla",
  "phone",
  "email",
  "nid",
];

// Filter fields
export const FILTERABLE_FIELDS = [
  "occupation",
  "institutionId",
];


// Export Prisma enums
export { RelationshipType, UserStatus };