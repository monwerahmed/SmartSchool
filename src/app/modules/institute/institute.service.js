import AppError from "../../error/AppError.js";
import httpStatus from "http-status";
import prisma from "../../config/database.js";
import {
  SEARCHABLE_FIELDS,
  FILTERABLE_FIELDS,
} from "./institution.constants.js";
/**
 * Create a new institution
 * Only SUPER_ADMIN can create institution
 */
const createInstitutionIntoDB = async (payload) => {
  // console.log(payload);
  // Check if institution code already exists
  const existingCode = await prisma.institution.findUnique({
    where: { code: payload.code },
  });

  if (existingCode) {
    throw new AppError(
      httpStatus.CONFLICT,
      `Institution with code '${payload.code}' already exists`,
    );
  }

  // Check if EIIN already exists (if provided)
  if (payload.eiin) {
    const existingEiin = await prisma.institution.findUnique({
      where: { eiin: payload.eiin },
    });

    if (existingEiin) {
      throw new AppError(
        httpStatus.CONFLICT,
        `Institution with EIIN '${payload.eiin}' already exists`,
      );
    }
  }

  // Create institution
  const institution = await prisma.institution.create({
    data: payload,
    select: {
      id: true,
      name: true,
      code: true,
      eiin: true,
      status: true,
      type: true,
      email: true,
      phone: true,
      address: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return institution;
};

/**
 * Get all institutions with search, filter, and pagination
 * Only SUPER_ADMIN can view all institutions
 */
const getAllInstitutionsFromDB = async (query) => {
  const {
    search,
    status,
    type,
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query;

  // Build where clause dynamically
  const where = {};

  // Search functionality
  if (search) {
    where.OR = SEARCHABLE_FIELDS.map((field) => ({
      [field]: {
        contains: search,
        mode: "insensitive",
      },
    }));
  }

  // Status filter
  if (status && ["ACTIVE", "INACTIVE", "SUSPENDED"].includes(status)) {
    where.status = status;
  }

  // Type filter
  if (type) {
    where.type = type;
  }

  // Pagination calculation
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  // Execute queries in parallel for better performance
  const [institutions, total] = await Promise.all([
    prisma.institution.findMany({
      where,
      skip,
      take,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        _count: {
          select: {
            students: true,
            teachers: true,
            guardians: true,
            users: true,
          },
        },
      },
    }),
    prisma.institution.count({ where }),
  ]);

  return {
    data: institutions,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

/**
 * Get single institution by ID with permission check
 * SUPER_ADMIN can view any institution
 * Others can only view their own institution
 */
const getInstitutionByIdFromDB = async (id, userId, userRoles) => {
  const institution = await prisma.institution.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          students: true,
          teachers: true,
          guardians: true,
          users: true,
        },
      },
    },
  });

  if (!institution) {
    throw new AppError(httpStatus.NOT_FOUND, "Institution not found");
  }

  // SUPER_ADMIN can view any institution
  if (userRoles.includes("SUPER_ADMIN")) {
    return institution;
  }

  // Others can only view their own institution
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { institutionId: true },
  });

  if (user.institutionId !== id) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only view your own institution",
    );
  }

  return institution;
};

/**
 * Update institution
 * SUPER_ADMIN can update any institution
 * Others can only update their own institution
 */
const updateInstitutionIntoDB = async (id, payload, userId, userRoles) => {
  // Check if institution exists
  const institution = await prisma.institution.findUnique({
    where: { id },
  });

  if (!institution) {
    throw new AppError(httpStatus.NOT_FOUND, "Institution not found");
  }

  // Permission check
  if (!userRoles.includes("SUPER_ADMIN")) {
    // Others can only update their own institution
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { institutionId: true },
    });

    if (user.institutionId !== id) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You can only update your own institution",
      );
    }
  }

  // Check if EIIN already exists (if changing EIIN)
  if (payload.eiin && payload.eiin !== institution.eiin) {
    const existingEiin = await prisma.institution.findUnique({
      where: { eiin: payload.eiin },
    });

    if (existingEiin) {
      throw new AppError(
        httpStatus.CONFLICT,
        `Institution with EIIN '${payload.eiin}' already exists`,
      );
    }
  }

  //  Whitelisting Payload

  const { name, eiin, type, email, phone, address, status } = payload;
  const updateData = { name, eiin, type, email, phone, address, status };

  // Update institution
  const updatedInstitution = await prisma.institution.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      code: true,
      eiin: true,
      status: true,
      type: true,
      email: true,
      phone: true,
      address: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updatedInstitution;
};

/**
 * Change institution status (SUPER_ADMIN only)
 * Can set status to ACTIVE, INACTIVE, or SUSPENDED
 */
const changeInstitutionStatusIntoDB = async (id, status) => {
  // Check if institution exists
  const institution = await prisma.institution.findUnique({
    where: { id },
  });

  if (!institution) {
    throw new AppError(httpStatus.NOT_FOUND, "Institution not found");
  }

  // Update status
  const updatedInstitution = await prisma.institution.update({
    where: { id },
    data: { status },
    select: {
      id: true,
      name: true,
      code: true,
      status: true,
      updatedAt: true,
    },
  });

  return updatedInstitution;
};

/**
 * Get institution statistics
 * Shows total counts of students, teachers, guardians, and users
 */
const getInstitutionStatsFromDB = async (id, userId, userRoles) => {
  // Check if institution exists
  const institution = await prisma.institution.findUnique({
    where: { id },
  });

  if (!institution) {
    throw new AppError(httpStatus.NOT_FOUND, "Institution not found");
  }

  // Permission check
  if (!userRoles.includes("SUPER_ADMIN")) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { institutionId: true },
    });

    if (user.institutionId !== id) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You can only view your own institution statistics",
      );
    }
  }

  // Get all counts in parallel
  const [
    totalStudents,
    totalTeachers,
    totalGuardians,
    totalUsers,
    activeUsers,
  ] = await Promise.all([
    prisma.student.count({ where: { institutionId: id } }),
    prisma.teacher.count({ where: { institutionId: id } }),
    prisma.guardian.count({ where: { institutionId: id } }),
    prisma.user.count({ where: { institutionId: id } }),
    prisma.user.count({
      where: { institutionId: id, isActive: "ACTIVE" },
    }),
  ]);

  return {
    institutionId: id,
    institutionName: institution.name,
    institutionCode: institution.code,
    institutionStatus: institution.status,
    totalStudents,
    totalTeachers,
    totalGuardians,
    totalUsers,
    activeUsers,
    inactiveUsers: totalUsers - activeUsers,
  };
};

export const institutionServices = {
  createInstitutionIntoDB,
  getAllInstitutionsFromDB,
  getInstitutionByIdFromDB,
  updateInstitutionIntoDB,
  changeInstitutionStatusIntoDB,
  getInstitutionStatsFromDB,
};
