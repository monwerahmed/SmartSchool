import httpStatus from "http-status";
import prisma from "../../config/database.js";
import AppError from "../../error/AppError.js";
import { hashPassword } from "../user/user.utils.js";
import { SEARCHABLE_FIELDS } from "./teacher.constants.js";
import { hasPermission } from "../../utils/permissions.js";

/**
 * Create teacher (User + Teacher profile in transaction)
 */

const createTeacherIntoDB = async (payload, requestingUser) => {
  const {
    // User data
    username,
    email,
    password,
    // Teacher data
    teacherCode,
    fullNameEnglish,
    fullNameBangla,
    dateOfBirth,
    gender,
    bloodGroup,
    subject,
    qualification,
    department,
    designation,
    joiningDate,
    phone,
    teacherEmail, // Professional email (separate from login email)
    address,
    nid,
    salary,
  } = payload;

  //  Get institutionId from token
  let institutionId = requestingUser.institutionId;

  if (!institutionId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Institution ID not found. Please provide institutionId or login with an institutional account.",
    );
  }

  const institution = await prisma.institution.findUnique({
    where: { id: institutionId },
    select: {
      id: true,
      name: true,
      status: true,
    },
  });

  if (!institution) {
    throw new AppError(httpStatus.NOT_FOUND, "Institution not found");
  }

  if (institution.status !== "ACTIVE") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot create teacher for ${institution.status} institution`,
    );
  }

  // Check teacherCode unique
  const existingTeacherCode = await prisma.teacher.findUnique({
    where: { teacherCode },
  });

  if (existingTeacherCode) {
    throw new AppError(
      httpStatus.CONFLICT,
      `Teacher with code "${teacherCode}" already exists`,
    );
  }

  // Check email unique (login email)
  const existingEmail = await prisma.user.findUnique({
    where: { email },
  });

  if (existingEmail) {
    throw new AppError(
      httpStatus.CONFLICT,
      "User with this email already exists",
    );
  }

  // Check username unique
  const existingUsername = await prisma.user.findUnique({
    where: { username },
  });

  if (existingUsername) {
    throw new AppError(httpStatus.CONFLICT, "Username already taken");
  }

  //  Check NID unique (if provided)

  if (nid) {
    const existingNID = await prisma.teacher.findUnique({
      where: { nid },
    });

    if (existingNID) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Teacher with this NID already exists",
      );
    }
  }

  // Get TEACHER role

  const teacherRole = await prisma.role.findUnique({
    where: { name: "TEACHER" },
  });

  if (!teacherRole) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "TEACHER role not found in database. Please run seed first!",
    );
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create User + Teacher Profile in Transaction

  const result = await prisma.$transaction(async (tx) => {
    // step 1: create user

    const user = await tx.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        institutionId,
      },
    });

    // step 2: assig the teacher role
    await tx.userRole.create({
      data: {
        userId: user.id,
        roleId: teacherRole.id,
      },
    });

    // step 3: Create Teacher Profile

    const teacher = await tx.teacher.create({
      data: {
        teacherCode,
        fullNameEnglish,
        fullNameBangla,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender,
        bloodGroup,
        qualification,
        department,
        designation,
        subject,
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        phone,
        email: teacherEmail,
        address,
        nid,
        salary,
        userId: user.id,
        institutionId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            isActive: true,
            userRoles: {
              include: {
                role: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                  },
                },
              },
            },
          },
        },
        institution: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    // step 4: return
    return teacher;
  });

  // Transform response
  const transformedResult = {
    id: result.id,
    teacherCode: result.teacherCode,
    fullNameEnglish: result.fullNameEnglish,
    fullNameBangla: result.fullNameBangla,
    dateOfBirth: result.dateOfBirth,
    gender: result.gender,
    bloodGroup: result.bloodGroup,
    qualification: result.qualification,
    department: result.department,
    designation: result.designation,
    subject: result.subject,
    joiningDate: result.joiningDate,
    phone: result.phone,
    email: result.email, // Professional email
    address: result.address,
    nid: result.nid,
    salary: result.salary, // Included for ADMIN who created
    user: {
      id: result.user.id,
      username: result.user.username,
      email: result.user.email, // Login email
      isActive: result.user.isActive,
    },
    institution: result.institution,
    roles: result.user.userRoles.map((ur) => ur.role),
    createdAt: result.createdAt,
  };

  return transformedResult;
};

/**
 * Get all teachers with search, filter, and pagination
 * Conditionally includes salary based on permissions
 */

const getAllTeachersFromDB = async (query, requestingUser) => {
  const {
    search,
    gender,
    bloodGroup,
    department,
    designation,
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query;

  // Check if user can see salary
  const canViewSalary = await hasPermission(
    requestingUser.userId,
    "TEACHER",
    "MANAGE",
  );

  // Build where clause
  const where = {};

  // Non-SUPER_ADMIN can only see their own institution's teachers
  if (!requestingUser.roles.includes("SUPER_ADMIN")) {
    where.institutionId = requestingUser.institutionId;
  } else if (query.institutionId) {
    where.institutionId = query.institutionId;
  }

  // Search
  if (search) {
    where.OR = SEARCHABLE_FIELDS.map((field) => ({
      [field]: {
        contains: search,
        mode: "insensitive",
      },
    }));
  }

  // Filter by gender
  if (gender && ["MALE", "FEMALE", "OTHER"].includes(gender)) {
    where.gender = gender;
  }

  // Filter by bloodGroup
  if (bloodGroup) {
    where.bloodGroup = bloodGroup;
  }

  // Filter by department
  if (department) {
    where.department = {
      contains: department,
      mode: "insensitive",
    };
  }

  // Filter by designation
  if (designation) {
    where.designation = {
      contains: designation,
      mode: "insensitive",
    };
  }

  // Pagination
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  // Execute queries in parallel
  const [teachers, total] = await Promise.all([
    prisma.teacher.findMany({
      where,
      skip,
      take,
      orderBy: {
        [sortBy]: sortOrder,
      },
      select: {
        id: true,
        teacherCode: true,
        fullNameEnglish: true,
        fullNameBangla: true,
        profilePhotoUrl: true,
        subject: true,
        address: true,
        dateOfBirth: true,
        gender: true,
        bloodGroup: true,
        qualification: true,
        department: true,
        designation: true,
        // subject: true,
        joiningDate: true,
        phone: true,
        email: true, // Professional email
        nid: true,
        salary: canViewSalary, // Conditionally select salary
        user: {
          select: {
            id: true,
            username: true,
            email: true, // Login email
            isActive: true,
          },
        },
        institution: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        createdAt: true,
      },
    }),
    prisma.teacher.count({ where }),
  ]);

  return {
    data: teachers,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

/**
 * Get single teacher by ID with detailed information
 */

const getTeacherByIdFromDB = async (id, requestingUser) => {
  // Check if user can see salary
  const canViewSalary = await hasPermission(
    requestingUser.userId,
    "TEACHER",
    "MANAGE",
  );

  const teacher = await prisma.teacher.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true, // Login email
          isActive: true,
          userRoles: {
            include: {
              role: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                },
              },
            },
          },
        },
      },
      institution: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });

  if (!teacher) {
    throw new AppError(httpStatus.NOT_FOUND, "Teacher not found");
  }

  // Permission check
  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    teacher.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only view teachers in your own institution",
    );
  }

  // Transform response
  const transformedResult = {
    ...teacher,
    salary: canViewSalary ? teacher.salary : undefined, // Hide salary if no permission
    roles: teacher.user.userRoles.map((ur) => ur.role),
    user: {
      id: teacher.user.id,
      username: teacher.user.username,
      email: teacher.user.email, // Login email
      isActive: teacher.user.isActive,
    },
  };

  return transformedResult;
};

/**
 * Get own profile (Teacher views self)
 */


const getOwnProfileFromDB = async (userId) => {
  const teacher = await prisma.teacher.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          isActive: true,
          userRoles: {
            include: {
              role: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                },
              },
            },
          },
        },
      },
      institution: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },

      //section
      assignedSubjects: {
        include: {
          subject: {
            select: { name: true, code: true }
          },
          class: {
            include: {
              sections: {
                include: {
                  _count: {
                    select: { enrollments: true }
                  }
                }
              }
            }
          }
        },
      },
      
    },
  });

  if (!teacher) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Teacher profile not found for this user",
    );
  }

  // Transform response - include salary (own profile)
  const transformedResult = {
    ...teacher,
    roles: teacher.user.userRoles.map((ur) => ur.role),
    user: {
      id: teacher.user.id,
      username: teacher.user.username,
      email: teacher.user.email,
      isActive: teacher.user.isActive,
    },
  };

  return transformedResult;
};

/**
 * Update teacher profile
 */

const updateTeacherIntoDB = async (id, payload, requestingUser) => {
  // Check teacher exists
  const existingTeacher = await prisma.teacher.findUnique({
    where: { id },
  });

  if (!existingTeacher) {
    throw new AppError(httpStatus.NOT_FOUND, "Teacher not found");
  }

  // Permission check
  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    existingTeacher.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only update teachers in your own institution",
    );
  }

  // Check if updating salary - need special permission
  if (payload.salary !== undefined) {
    const canManageSalary = await hasPermission(
      requestingUser.userId,
      "TEACHER",
      "MANAGE",
    );

    if (!canManageSalary) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You do not have permission to update salary",
      );
    }
  }

  // Convert dates if provided
  const updateData = {
    ...payload,
    email: payload.teacherEmail, // Map teacherEmail to email field
    teacherEmail: undefined, // Remove from payload
  };

  if (updateData.dateOfBirth) {
    updateData.dateOfBirth = new Date(updateData.dateOfBirth);
  }

  if (updateData.joiningDate) {
    updateData.joiningDate = new Date(updateData.joiningDate);
  }

  // Update teacher
  const updatedTeacher = await prisma.teacher.update({
    where: { id },
    data: updateData,
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          isActive: true,
        },
      },
      institution: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });

  return updatedTeacher;
};

/**
 * Change teacher status (changes user.isActive)
 */
const changeTeacherStatusIntoDB = async (id, status, requestingUser) => {
  // Check teacher exists
  const existingTeacher = await prisma.teacher.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          isActive: true,
        },
      },
    },
  });

  if (!existingTeacher) {
    throw new AppError(httpStatus.NOT_FOUND, "Teacher not found");
  }

  // Permission check
  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    existingTeacher.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only change status of teachers in your own institution",
    );
  }

  // Update user status
  await prisma.user.update({
    where: { id: existingTeacher.userId },
    data: { isActive: status },
  });

  return {
    id: existingTeacher.id,
    teacherCode: existingTeacher.teacherCode,
    fullNameEnglish: existingTeacher.fullNameEnglish,
    previousStatus: existingTeacher.user.isActive,
    newStatus: status,
  };
};

/**
 * Get teacher's assigned subjects
 */

const getTeacherSubjects = async (teacherId, requestingUser) => {
  // Get teacher
  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: {
      id: true,
      fullNameEnglish: true,
      teacherCode: true,
      designation: true,
      institutionId: true,
    },
  });

  if (!teacher) {
    throw new AppError(httpStatus.NOT_FOUND, "Teacher not found");
  }

  // Permission check
  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    teacher.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only view teachers in your own institution",
    );
  }

  // Get assigned subjects
  const assignedSubjects = await prisma.academicClassSubject.findMany({
    where: {
      teacherId,
    },
    include: {
      class: {
        select: {
          id: true,
          name: true,
          academicYear: true,
        },
      },
      subject: {
        select: {
          id: true,
          name: true,
          code: true,
          category: true,
        },
      },
    },
    orderBy: [{ class: { name: "asc" } }, { subject: { name: "asc" } }],
  });

  return {
    teacher: {
      id: teacher.id,
      fullNameEnglish: teacher.fullNameEnglish,
      teacherCode: teacher.teacherCode,
      designation: teacher.designation,
    },
    totalAssignments: assignedSubjects.length,
    assignments: assignedSubjects.map((assignment) => ({
      id: assignment.id,
      class: assignment.class,
      subject: assignment.subject,
      totalMarks: assignment.totalMarks,
      passingMarks: assignment.passingMarks,
      isCompulsory: assignment.isCompulsory,
    })),
  };
};

export const teacherServices = {
  createTeacherIntoDB,
  getAllTeachersFromDB,
  getTeacherByIdFromDB,
  getOwnProfileFromDB,
  updateTeacherIntoDB,
  changeTeacherStatusIntoDB,
  getTeacherSubjects,
};
