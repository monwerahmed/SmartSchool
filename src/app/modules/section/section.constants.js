import { SectionShift } from "@prisma/client";

// Search fields
export const SEARCHABLE_FIELDS = ["name"];

// Filter fields
export const FILTERABLE_FIELDS = ["classId", "shift", "institutionId"];

// Export Prisma enum for use in code
export { SectionShift };
