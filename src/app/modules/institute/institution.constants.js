import { InstitutionStatus } from "@prisma/client";

export const INSTITUTION_TYPES = [
  "Primary School",
  "High School",
  "Secondary School",
  "Higher Secondary School",
  "College",
  "Madrasa",
  "Technical Institute",
  "University",
  "Coaching Center",
  "English Medium",
];

export const INSTITUTION_STATUS = InstitutionStatus;

// Search fields
export const SEARCHABLE_FIELDS = ["name", "code", "eiin", "email", "phone"];

// Filter fields
export const FILTERABLE_FIELDS = ["status", "type"];
