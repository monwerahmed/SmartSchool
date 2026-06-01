import httpStatus from "http-status";
import prisma from "../../config/database.js";
import AppError from "../../error/AppError.js";
import { hashPassword } from "../user/user.utils.js";
import { SEARCHABLE_FIELDS } from "./student.constants.js";

/**
 * Create student (User + Student profile in transaction)
 *
 * Flow:
 * 1. Get institutionId from token (auto-fill)
 * 2. Validate institution exists and is active
 * 3. Check studentCode, email, username uniqueness
 * 4. Get STUDENT role
 * 5. Hash password
 * 6. Transaction: Create User + Assign Role + Create Student Profile
 * 7. Return complete student data
 */

const createStudentIntoDB = async (payload, requestingUser) => {
  const {
    // User data
    username,
    email,
    password,
    // Student data
    studentCode,
    fullNameEnglish,
    fullNameBangla,
    dateOfBirth,
    gender,
    bloodGroup,
    phone,
    address,
  } = payload;

  // Step 1: Get institutionId from token
  let institutionId = requestingUser.institutionId;

  if (!institutionId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Institution ID not found. Please provide institutionId or login with an institutional account.",
    );
  }

  // Step 2: Check institution exists and is active
  const institution = await prisma.institution.findUnique({
    where: { id: institutionId },
    select: { id: true, name: true, status: true },
  });

  if (!institution) {
    throw new AppError(httpStatus.NOT_FOUND, "Institution not found");
  }

  if (institution.status !== "ACTIVE") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot create student for ${institution.status} institution`,
    );
  }

  // Step 3: Check studentCode unique
  const existingStudentCode = await prisma.student.findUnique({
    where: { studentCode },
  });

  if (existingStudentCode) {
    throw new AppError(
      httpStatus.CONFLICT,
      `Student with code "${studentCode}" already exists`,
    );
  }

  // Step 4: Check email unique
  const existingEmail = await prisma.user.findUnique({
    where: { email },
  });

  if (existingEmail) {
    throw new AppError(
      httpStatus.CONFLICT,
      "User with this email already exists",
    );
  }

  // Step 5: Check username unique
  const existingUsername = await prisma.user.findUnique({
    where: { username },
  });

  if (existingUsername) {
    throw new AppError(httpStatus.CONFLICT, "Username already taken");
  }

  // Step 6: Get STUDENT role
  const studentRole = await prisma.role.findUnique({
    where: { name: "STUDENT" },
  });

  if (!studentRole) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "STUDENT role not found in database. Please run seed first!",
    );
  }

  // Step 7: Hash password
  const hashedPassword = await hashPassword(password);

  // Step 8: Create User + Student Profile in Transaction
  const result = await prisma.$transaction(async (tx) => {
    // Operation 1: Create User
    const user = await tx.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        institutionId,
      },
    });

    // Operation 2: Assign STUDENT role
    await tx.userRole.create({
      data: {
        userId: user.id,
        roleId: studentRole.id,
      },
    });

    // Operation 3: Create Student Profile
    const student = await tx.student.create({
      data: {
        studentCode,
        fullNameEnglish,
        fullNameBangla,
        dateOfBirth: new Date(dateOfBirth),
        gender,
        bloodGroup,
        phone,
        address,
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

    return student;
  });

  // Transform response
  const transformedResult = {
    id: result.id,
    studentCode: result.studentCode,
    fullNameEnglish: result.fullNameEnglish,
    fullNameBangla: result.fullNameBangla,
    dateOfBirth: result.dateOfBirth,
    gender: result.gender,
    bloodGroup: result.bloodGroup,
    phone: result.phone,
    address: result.address,
    user: {
      id: result.user.id,
      username: result.user.username,
      email: result.user.email,
      isActive: result.user.isActive,
    },
    institution: result.institution,
    roles: result.user.userRoles.map((ur) => ur.role),
    currentEnrollment: null, // Not enrolled yet
    createdAt: result.createdAt,
  };

  return transformedResult;
};

/**
 * Get all students with search, filter, and pagination
 */

const getAllStudentsFromDB = async (query, requestingUser) => {
  const {
    search,
    gender,
    bloodGroup,
    address,
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query;

  // Build where clause
  const where = {};

  // Non-SUPER_ADMIN can only see their own institution's students
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

  // Pagination
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  // Execute queries in parallel
  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      skip,
      take,
      orderBy: {
        [sortBy]: sortOrder,
      },
      select: {
        id: true,
        studentCode: true,
        fullNameEnglish: true,
        fullNameBangla: true,
        profilePhotoUrl: true,
        dateOfBirth: true,
        gender: true,
        bloodGroup: true,
        phone: true,
        address: true,
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
        // Get current enrollment (ACTIVE status)
        enrollments: {
          where: {
            status: "ACTIVE",
          },
          take: 1,
          select: {
            id: true,
            academicYear: true,
            rollNumber: true,
            section: {
              select: {
                id: true,
                name: true,
                shift: true,
                class: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        createdAt: true,
      },
    }),
    prisma.student.count({ where }),
  ]);

  // Transform response to include currentEnrollment
  const studentsWithEnrollment = students.map((student) => ({
    ...student,
    currentEnrollment: student.enrollments[0] || null,
    enrollments: undefined, // Remove enrollments array from response
  }));

  return {
    data: studentsWithEnrollment,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

/**
 * Get single student by ID with detailed information
 */

const getStudentByIdFromDB = async (id, requestingUser) => {
  const student = await prisma.student.findUnique({
    where: { id },
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
      // Current enrollment
      enrollments: {
        where: {
          status: "ACTIVE",
        },
        include: {
          section: {
            select: {
              id: true,
              name: true,
              shift: true,
              capacity: true,
              class: {
                select: {
                  id: true,
                  name: true,
                  academicYear: true,
                },
              },
            },
          },
        },
      },
      // Guardians
      guardianStudents: {
        include: {
          guardian: {
            select: {
              id: true,
              guardianCode: true,
              fullNameEnglish: true,
              fullNameBangla: true,
              phone: true,
              email: true,
              occupation: true,
            },
          },
        },
      },
    },
  });

  if (!student) {
    throw new AppError(httpStatus.NOT_FOUND, "Student not found");
  }

  // Permission check
  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    student.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only view students in your own institution",
    );
  }

  // Transform response
  const transformedResult = {
    ...student,
    roles: student.user.userRoles.map((ur) => ur.role),
    currentEnrollment: student.enrollments[0] || null,
    guardians: student.guardianStudents.map((gs) => ({
      ...gs.guardian,
      relationship: gs.relationship,
      isPrimary: gs.isPrimary,
    })),
    user: {
      id: student.user.id,
      username: student.user.username,
      email: student.user.email,
      isActive: student.user.isActive,
    },
    enrollments: undefined,
    guardianStudents: undefined,
  };

  return transformedResult;
};

/**
 * 
 *Get Own Profile From DB
 */

const getOwnProfileFromDB = async (userId) => {
  const student = await prisma.student.findUnique({
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
      enrollments: {
        select: {
          rollNumber: true,
          section: { 
            select: {
              id: true,
              name: true,
              class: {
                select: {
                  id: true,
                  name: true,
                  academicYear: true,
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
      guardianStudents : {
        include: {
      guardian: {
        select: {
          fullNameBangla: true,
          fullNameEnglish: true,
          phone: true,
          email: true,
          address: true,
          occupation: true,
        }
      }
    }
      }
    },
  });

  if (!student) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Student profile not found for this user",
    );
  }

  // Transform response - include salary (own profile)
  const transformedResult = {
    ...student,
    roles: student.user.userRoles.map((ur) => ur.role),
    user: {
      id: student.user.id,
      username: student.user.username,
      email: student.user.email,
      isActive: student.user.isActive,
    },
  };

  return transformedResult;
};

/**
 * Update student profile
 *
 * Only allows updating specific fields
 */

const updateStudentIntoDB = async (id, payload, requestingUser) => {
  // Check student exists
  const existingStudent = await prisma.student.findUnique({
    where: { id },
  });

  if (!existingStudent) {
    throw new AppError(httpStatus.NOT_FOUND, "Student not found");
  }

  // Permission check
  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    existingStudent.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only update students in your own institution",
    );
  }

  // Update student
  const updatedStudent = await prisma.student.update({
    where: { id },
    data: payload,
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

  return updatedStudent;
};

/**
 * Change student status (changes user.isActive)
 */

const changeStudentStatusIntoDB = async (id, status, requestingUser) => {
  // Check student exists
  const existingStudent = await prisma.student.findUnique({
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

  if (!existingStudent) {
    throw new AppError(httpStatus.NOT_FOUND, "Student not found");
  }

  // Permission check
  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    existingStudent.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only change status of students in your own institution",
    );
  }

  // Update user status
  await prisma.user.update({
    where: { id: existingStudent.userId },
    data: { isActive: status },
  });

  return {
    id: existingStudent.id,
    studentCode: existingStudent.studentCode,
    fullNameEnglish: existingStudent.fullNameEnglish,
    previousStatus: existingStudent.user.isActive,
    newStatus: status,
  };
};

/**
 * Enroll student in a section
 *
 * Checks:
 * 1. Student exists and belongs to same institution
 * 2. Section exists and belongs to same institution
 * 3. Section has available capacity
 * 4. Student not already enrolled in this academic year
 */

const enrollStudentIntoDB = async (studentId, payload, requestingUser) => {
  const { sectionId, academicYear, rollNumber } = payload;

  // Step 1: Check student exists
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      studentCode: true,
      fullNameEnglish: true,
      institutionId: true,
    },
  });

  if (!student) {
    throw new AppError(httpStatus.NOT_FOUND, "Student not found");
  }

  // Step 2: Permission check
  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    student.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only enroll students in your own institution",
    );
  }

  // Step 3: Check section exists
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    include: {
      class: {
        select: {
          id: true,
          name: true,
          academicYear: true,
        },
      },
      _count: {
        select: {
          enrollments: {
            where: {
              status: "ACTIVE",
            },
          },
        },
      },
    },
  });

  if (!section) {
    throw new AppError(httpStatus.NOT_FOUND, "Section not found");
  }

  // Step 4: Check same institution
  if (section.institutionId !== student.institutionId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Student and section must belong to the same institution",
    );
  }

  // Step 5: Check capacity
  const currentEnrollments = section._count.enrollments;
  if (currentEnrollments >= section.capacity) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Section "${section.name}" is full. Capacity: ${section.capacity}, Current: ${currentEnrollments}`,
    );
  }

  // Step 6: Check if already enrolled in this year
  const existingEnrollment = await prisma.studentEnrollment.findUnique({
    where: {
      studentId_academicYear: {
        studentId,
        academicYear,
      },
    },
  });

  if (existingEnrollment) {
    throw new AppError(
      httpStatus.CONFLICT,
      `Student is already enrolled for academic year ${academicYear}`,
    );
  }

  // Step 7: Create enrollment
  const enrollment = await prisma.studentEnrollment.create({
    data: {
      studentId,
      sectionId,
      academicYear,
      rollNumber,
      status: "ACTIVE",
    },
    include: {
      student: {
        select: {
          id: true,
          studentCode: true,
          fullNameEnglish: true,
        },
      },
      section: {
        include: {
          class: {
            select: {
              id: true,
              name: true,
              academicYear: true,
            },
          },
        },
      },
    },
  });

  return enrollment;
};

/**
 * Get student's enrollment history
 */

const getStudentEnrollmentsFromDB = async (studentId, requestingUser) => {
  // Check student exists
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      institutionId: true,
    },
  });

  if (!student) {
    throw new AppError(httpStatus.NOT_FOUND, "Student not found");
  }

  // Permission check
  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    student.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only view enrollments of students in your own institution",
    );
  }

  // Get all enrollments
  const enrollments = await prisma.studentEnrollment.findMany({
    where: { studentId },
    orderBy: {
      academicYear: "desc",
    },
    include: {
      section: {
        include: {
          class: {
            select: {
              id: true,
              name: true,
              academicYear: true,
            },
          },
        },
      },
    },
  });

  return enrollments;
};

/**
 * Update enrollment status
 */
const updateEnrollmentStatusIntoDB = async (
  enrollmentId,
  status,
  requestingUser,
) => {
  // Check enrollment exists
  const enrollment = await prisma.studentEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      student: {
        select: {
          institutionId: true,
        },
      },
    },
  });

  if (!enrollment) {
    throw new AppError(httpStatus.NOT_FOUND, "Enrollment not found");
  }

  // Permission check
  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    enrollment.student.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only update enrollments in your own institution",
    );
  }

  // Update status
  const updatedEnrollment = await prisma.studentEnrollment.update({
    where: { id: enrollmentId },
    data: { status },
    include: {
      student: {
        select: {
          id: true,
          studentCode: true,
          fullNameEnglish: true,
        },
      },
      section: {
        include: {
          class: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  return updatedEnrollment;
};

export const studentServices = {
  createStudentIntoDB,
  getAllStudentsFromDB,
  getOwnProfileFromDB,
  getStudentByIdFromDB,
  updateStudentIntoDB,
  changeStudentStatusIntoDB,
  enrollStudentIntoDB,
  getStudentEnrollmentsFromDB,
  updateEnrollmentStatusIntoDB,
};
