import httpStatus from "http-status";
import prisma from "../../config/database.js";
import AppError from "../../error/AppError.js";
/**
 * Create a new section
 *
 * Flow:
 * 1. Verify classId exists and belongs to user's institution
 * 2. Get institutionId from the class (auto-fill)
 * 3. Check duplicate (same name + same classId)
 * 4. Create section
 */

const createSectionIntoDB = async (payload, requestingUser) => {
  const { name, classId, shift, capacity = 40 } = payload;

  // Step 1: Check if class exists
  const academicClass = await prisma.academicClass.findUnique({
    where: { id: classId },
    select: {
      id: true,
      name: true,
      academicYear: true,
      institutionId: true,
      institution: {
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
        },
      },
    },
  });

  if (!academicClass) {
    throw new AppError(httpStatus.NOT_FOUND, "Academic class not found");
  }

  // Step 2: Permission check
  // Non-SUPER_ADMIN can only create sections in their own institution
  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    academicClass.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only create sections in your own institution",
    );
  }

  // Step 3: Check institution is active
  if (academicClass.institution.status !== "ACTIVE") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot create section for ${academicClass.institution.status} institution`,
    );
  }

  // Step 4: Check duplicate
  // Same name + same classId = duplicate
  const existingSection = await prisma.section.findUnique({
    where: {
      name_classId: {
        name,
        classId,
      },
    },
  });

  if (existingSection) {
    throw new AppError(
      httpStatus.CONFLICT,
      `Section "${name}" already exists in ${academicClass.name}`,
    );
  }

  // Step 5: Create section
  // institutionId auto-filled from class
  const section = await prisma.section.create({
    data: {
      name,
      classId,
      shift,
      capacity,
      institutionId: academicClass.institutionId, // Auto-fill
    },
    select: {
      id: true,
      name: true,
      shift: true,
      capacity: true,
      classId: true,
      class: {
        select: {
          id: true,
          name: true,
          academicYear: true,
        },
      },
      institutionId: true,
      institution: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      _count: {
        select: {
          enrollments: true,
        },
      },
      createdAt: true,
      updatedAt: true,
    },
  });

  return section;
};

/**
 * Get all sections
 *
 * Features:
 * - Search by name
 * - Filter by classId
 * - Filter by shift
 * - Filter by institutionId (SUPER_ADMIN only)
 * - Pagination
 * - Auto filter by institution for non-SUPER_ADMIN
 */

const getAllSectionsFromDB = async (query, requestingUser) => {
  const {
    search,
    classId,
    shift,
    page = 1,
    limit = 10,
    sortBy = "name",
    sortOrder = "asc",
  } = query;

  // Build where clause
  const where = {};

  // Non-SUPER_ADMIN can only see their own institution's sections
  if (!requestingUser.roles.includes("SUPER_ADMIN")) {
    where.institutionId = requestingUser.institutionId;
  } else if (query.institutionId) {
    where.institutionId = query.institutionId;
  }

  // Search by name
  if (search) {
    where.name = {
      contains: search,
      mode: "insensitive",
    };
  }

  // Filter by classId
  if (classId) {
    where.classId = classId;
  }

  // Filter by shift
  if (shift && ["MORNING", "DAY", "EVENING"].includes(shift)) {
    where.shift = shift;
  }

  // Pagination
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  // Execute queries in parallel
  const [sections, total] = await Promise.all([
    prisma.section.findMany({
      where,
      skip,
      take,
      orderBy: {
        [sortBy]: sortOrder,
      },
      select: {
        id: true,
        name: true,
        shift: true,
        capacity: true,
        classId: true,
        class: {
          select: {
            id: true,
            name: true,
            academicYear: true,
          },
        },
        institutionId: true,
        institution: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.section.count({ where }),
  ]);

  // Add available seats to response
  const sectionsWithSeats = sections.map((section) => ({
    ...section,
    enrolledStudents: section._count.enrollments,
    availableSeats: section.capacity - section._count.enrollments,
  }));

  return {
    data: sectionsWithSeats,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

/**
 * Get single section by ID
 *
 * Returns section with:
 * - Class and institution details
 * - All enrolled students (with pagination)
 * - Available seats calculation
 */

const getSectionByIdFromDB = async (id, requestingUser) => {
  const section = await prisma.section.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      shift: true,
      capacity: true,
      classId: true,
      class: {
        select: {
          id: true,
          name: true,
          academicYear: true,
        },
      },
      institutionId: true,
      institution: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      _count: {
        select: {
          enrollments: true,
        },
      },
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!section) {
    throw new AppError(httpStatus.NOT_FOUND, "Section not found");
  }
  // Permission check
  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    section.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only view sections in your own institution",
    );
  }

  // Add available seats
  const sectionWithSeats = {
    ...section,
    enrolledStudents: section._count.enrollments,
    availableSeats: section.capacity - section._count.enrollments,
  };

  return sectionWithSeats;
};

/**
 * Update section
 *
 * Rules:
 * - name can be updated (check duplicate)
 * - shift can be updated
 * - capacity can be updated (must be >= enrolled students)
 * - classId cannot be changed
 */
const updateSectionIntoDB = async (id, payload, requestingUser) => {
  // Step 1: Check section exists
  const existingSection = await prisma.section.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          enrollments: true,
        },
      },
    },
  });
  if (!existingSection) {
    throw new AppError(httpStatus.NOT_FOUND, "Section not found");
  }

  // Step 2: Permission check
  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    existingSection.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only update sections in your own institution",
    );
  }

  // Step 3: Validate capacity (if being changed)
  if (payload.capacity !== undefined) {
    const enrolledCount = existingSection._count.enrollments;

    if (payload.capacity < enrolledCount) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Cannot reduce capacity to ${payload.capacity}. Currently ${enrolledCount} students are enrolled. Please transfer students first.`,
      );
    }
  }

  // Step 4: Check duplicate name (if name is being changed)
  if (payload.name && payload.name !== existingSection.name) {
    const duplicateSection = await prisma.section.findUnique({
      where: {
        name_classId: {
          name: payload.name,
          classId: existingSection.classId,
        },
      },
    });

    if (duplicateSection) {
      throw new AppError(
        httpStatus.CONFLICT,
        `Section "${payload.name}" already exists in this class`,
      );
    }
  }

  // Step 5: Update section
  const updatedSection = await prisma.section.update({
    where: { id },
    data: payload,
    select: {
      id: true,
      name: true,
      shift: true,
      capacity: true,
      classId: true,
      class: {
        select: {
          id: true,
          name: true,
          academicYear: true,
        },
      },
      institutionId: true,
      institution: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      _count: {
        select: {
          enrollments: true,
        },
      },
      createdAt: true,
      updatedAt: true,
    },
  });

  // Add available seats
  const sectionWithSeats = {
    ...updatedSection,
    enrolledStudents: updatedSection._count.enrollments,
    availableSeats: updatedSection.capacity - updatedSection._count.enrollments,
  };

  return sectionWithSeats;
};

/**
 * Delete section
 *
 * Rules:
 * - Cannot delete if enrollments exist
 * - Hard delete (permanent)
 */

const deleteSectionFromDB = async (id, requestingUser) => {
  // Step 1: Check section exists
  const existingSection = await prisma.section.findUnique({
    where: { id },
    include: {
      class: {
        select: {
          name: true,
        },
      },
      _count: {
        select: {
          enrollments: true,
        },
      },
    },
  });

  if (!existingSection) {
    throw new AppError(httpStatus.NOT_FOUND, "Section not found");
  }

  // Step 2: Permission check
  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    existingSection.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only delete sections in your own institution",
    );
  }

  // Step 3: Check if enrollments exist
  if (existingSection._count.enrollments > 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot delete section "${existingSection.name}". ${existingSection._count.enrollments} student(s) are currently enrolled. Please transfer students first.`,
    );
  }

  // Step 4: Delete section
  await prisma.section.delete({
    where: { id },
  });

  return {
    id: existingSection.id,
    name: existingSection.name,
    className: existingSection.class.name,
  };
};

export const sectionServices = {
  createSectionIntoDB,
  getAllSectionsFromDB,
  getSectionByIdFromDB,
  updateSectionIntoDB,
  deleteSectionFromDB,
};
