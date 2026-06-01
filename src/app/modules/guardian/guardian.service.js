import prisma from "../../config/database.js";
import AppError from "../../error/AppError.js";
import httpStatus from "http-status";
import { hashPassword } from "../user/user.utils.js";
import { SEARCHABLE_FIELDS } from "./guardian.constants.js";

/**
 * Create guardian (User + Guardian profile in transaction)
 */

const createGuardianIntoDB = async (payload, requestingUser) => {
  const {
    // User data
    username,
    email,
    password,
    // Guardian data
    guardianCode,
    fullNameEnglish,
    fullNameBangla,
    phone,
    guardianEmail,
    address,
    nid,
    occupation,
    monthlyIncome,
  } = payload;

  // Get institutionId from token
  let institutionId = requestingUser.institutionId;

  if (!institutionId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Institution ID not found. Please provide institutionId or login with an institutional account.",
    );
  }

  //  Check institution exists and is active
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
      `Cannot create guardian for ${institution.status} institution`,
    );
  }

  // Check guardianCode unique
  const existingGuardianCode = await prisma.guardian.findUnique({
    where: { guardianCode },
  });

  if (existingGuardianCode) {
    throw new AppError(
      httpStatus.CONFLICT,
      `Guardian with code "${guardianCode}" already exists`,
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

  //  Check username unique
  const existingUsername = await prisma.user.findUnique({
    where: { username },
  });

  if (existingUsername) {
    throw new AppError(httpStatus.CONFLICT, "Username already taken");
  }

  //  Check NID unique (if provided)
  if (nid) {
    const existingNID = await prisma.guardian.findUnique({
      where: { nid },
    });

    if (existingNID) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Guardian with this NID already exists",
      );
    }
  }

  // Get PARENT role
  const parentRole = await prisma.role.findUnique({
    where: { name: "GUARDIAN" },
  });

  console.log("Parant Role:", parentRole)

  if (!parentRole) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "PARENT role not found in database. Please run seed first!",
    );
  }

  //  Hash password
  const hashedPassword = await hashPassword(password);

  // Create User + Guardian Profile in Transaction
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

    // step 2: assign parents role

    await tx.userRole.create({
      data: {
        userId: user.id,
        roleId: parentRole.id,
      },
    });

    // step 3: created the guardian role
    const guardian = await tx.guardian.create({
      data: {
        guardianCode,
        fullNameEnglish,
        fullNameBangla,
        phone,
        email: guardianEmail, // Professional email
        address,
        nid,
        occupation,
        monthlyIncome,
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
    return guardian;
  });

  // Transform response
  const transformedResult = {
    id: result.id,
    guardianCode: result.guardianCode,
    fullNameEnglish: result.fullNameEnglish,
    fullNameBangla: result.fullNameBangla,
    phone: result.phone,
    email: result.email, // Professional email
    address: result.address,
    nid: result.nid,
    occupation: result.occupation,
    monthlyIncome: result.monthlyIncome,
    user: {
      id: result.user.id,
      username: result.user.username,
      email: result.user.email, // Login email
      isActive: result.user.isActive,
    },
    institution: result.institution,
    roles: result.user.userRoles.map((ur) => ur.role),
    linkedStudents: [], // No students linked yet
    createdAt: result.createdAt,
  };

  return transformedResult;
};

/**
 * Get all guardians with search, filter, and pagination
 */

const getAllGuardiansFromDB = async (query, requestingUser) => {
  const {
    search,
    occupation,
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query;

  // Build where clause
  const where = {};

  // Non-SUPER_ADMIN can only see their own institution's guardians
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

  // Filter by occupation
  if (occupation) {
    where.occupation = {
      contains: occupation,
      mode: "insensitive",
    };
  }

  // Pagination
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  // Execute queries in parallel
  const [guardians, total] = await Promise.all([
    prisma.guardian.findMany({
      where,
      skip,
      take,
      orderBy: {
        [sortBy]: sortOrder,
      },
      select: {
        id: true,
        guardianCode: true,
        fullNameEnglish: true,
        fullNameBangla: true,
        phone: true,
        email: true,
        occupation: true,
        monthlyIncome: true,
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
        // Count linked students
        _count: {
          select: {
            guardianStudents: true,
          },
        },
        createdAt: true,
      },
    }),
    prisma.guardian.count({ where }),
  ]);

  // Transform to include student count
  const guardiansWithCount = guardians.map((guardian) => ({
    ...guardian,
    linkedStudentsCount: guardian._count.guardianStudents,
    _count: undefined,
  }));

  return {
    data: guardiansWithCount,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

/**
 * Get single guardian by ID with linked students
 */
const getGuardianByIdFromDB = async (id, requestingUser) => {
  const guardian = await prisma.guardian.findUnique({
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
      // Get linked students with details
      guardianStudents: {
        include: {
          student: {
            select: {
              id: true,
              studentCode: true,
              fullNameEnglish: true,
              fullNameBangla: true,
              profilePhotoUrl: true,
              gender: true,
              // Get current enrollment
              enrollments: {
                where: {
                  status: "ACTIVE",
                },
                take: 1,
                select: {
                  academicYear: true,
                  rollNumber: true,
                  section: {
                    select: {
                      name: true,
                      class: {
                        select: {
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!guardian) {
    throw new AppError(httpStatus.NOT_FOUND, "Guardian not found");
  }

  // Permission check
  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    guardian.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only view guardians in your own institution",
    );
  }

  // Transform response
  const transformedResult = {
    ...guardian,
    roles: guardian.user.userRoles.map((ur) => ur.role),
    students: guardian.guardianStudents.map((gs) => ({
      id: gs.student.id,
      studentCode: gs.student.studentCode,
      fullNameEnglish: gs.student.fullNameEnglish,
      fullNameBangla: gs.student.fullNameBangla,
      profilePhotoUrl: gs.student.profilePhotoUrl,
      gender: gs.student.gender,
      relationship: gs.relationship,
      isPrimary: gs.isPrimary,
      currentEnrollment: gs.student.enrollments[0] || null,
      linkId: gs.id,
    })),
    user: {
      id: guardian.user.id,
      username: guardian.user.username,
      email: guardian.user.email,
      isActive: guardian.user.isActive,
    },
    guardianStudents: undefined,
  };

  return transformedResult;
};

/**
 * Get own profile (Guardian/Parent views self)
 */

const getOwnProfileFromDB = async (userId) => {
  const guardian = await prisma.guardian.findUnique({
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
      guardianStudents: {
        include: {
          student: {
            select: {
              id: true,
              studentCode: true,
              fullNameEnglish: true,
              fullNameBangla: true,
              profilePhotoUrl: true,
              gender: true,
              enrollments: {
                where: {
                  status: "ACTIVE",
                },
                take: 1,
                select: {
                  academicYear: true,
                  rollNumber: true,
                  section: {
                    select: {
                      name: true,
                      class: {
                        select: {
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!guardian) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Guardian profile not found for this user",
    );
  }

  // Transform response
  const transformedResult = {
    ...guardian,
    roles: guardian.user.userRoles.map((ur) => ur.role),
    students: guardian.guardianStudents.map((gs) => ({
      id: gs.student.id,
      studentCode: gs.student.studentCode,
      fullNameEnglish: gs.student.fullNameEnglish,
      fullNameBangla: gs.student.fullNameBangla,
      profilePhotoUrl: gs.student.profilePhotoUrl,
      gender: gs.student.gender,
      relationship: gs.relationship,
      isPrimary: gs.isPrimary,
      currentEnrollment: gs.student.enrollments[0] || null,
    })),
    user: {
      id: guardian.user.id,
      username: guardian.user.username,
      email: guardian.user.email,
      isActive: guardian.user.isActive,
    },
    guardianStudents: undefined,
  };

  return transformedResult;
};

/**
 * Update guardian profile
 */

const updateGuardianIntoDB = async (id, payload, requestingUser) => {
  // Check guardian exists
  const existingGuardian = await prisma.guardian.findUnique({
    where: { id },
  });

  if (!existingGuardian) {
    throw new AppError(httpStatus.NOT_FOUND, "Guardian not found");
  }

  // Permission check
  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    existingGuardian.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only update guardians in your own institution",
    );
  }

  // Map guardianEmail to email field
  const updateData = {
    ...payload,
    email: payload.guardianEmail,
    guardianEmail: undefined,
  };

  // Update guardian
  const updatedGuardian = await prisma.guardian.update({
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

  return updatedGuardian;
};

/**
 * Change guardian status (changes user.isActive)
 */

const changeGuardianStatusIntoDB = async (id, status, requestingUser) => {
  // Check guardian exists
  const existingGuardian = await prisma.guardian.findUnique({
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

  if (!existingGuardian) {
    throw new AppError(httpStatus.NOT_FOUND, "Guardian not found");
  }

  // Permission check
  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    existingGuardian.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only change status of guardians in your own institution",
    );
  }

  // Update user status
  await prisma.user.update({
    where: { id: existingGuardian.userId },
    data: { isActive: status },
  });

  return {
    id: existingGuardian.id,
    guardianCode: existingGuardian.guardianCode,
    fullNameEnglish: existingGuardian.fullNameEnglish,
    previousStatus: existingGuardian.user.isActive,
    newStatus: status,
  };
};

/**
 * Link guardian to student
 *
 * Critical: Handles primary guardian logic
 */

const linkGuardianToStudentIntoDB = async (
  guardianId,
  payload,
  requestingUser,
) => {
  const { studentId, relationship, isPrimary } = payload;

  // Step 1: Check guardian exists
  const guardian = await prisma.guardian.findUnique({
    where: { id: guardianId },
    select: {
      id: true,
      guardianCode: true,
      fullNameEnglish: true,
      institutionId: true,
    },
  });

  if (!guardian) {
    throw new AppError(httpStatus.NOT_FOUND, "Guardian not found");
  }

  // Step 2: Permission check
  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    guardian.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only link guardians in your own institution",
    );
  }

  // Step 3: Check student exists
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

  // Step 4: Check same institution
  if (guardian.institutionId !== student.institutionId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Guardian and student must belong to the same institution",
    );
  }

  // Step 5: Check if already linked
  const existingLink = await prisma.guardianStudent.findUnique({
    where: {
      guardianId_studentId: {
        guardianId,
        studentId,
      },
    },
  });

  if (existingLink) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Guardian is already linked to this student",
    );
  }

  // Step 6: Handle primary guardian logic
  let link;

  if (isPrimary) {
    // Use transaction to handle primary logic atomically
    link = await prisma.$transaction(async (tx) => {
      // Find existing primary guardian for this student
      const existingPrimary = await tx.guardianStudent.findFirst({
        where: {
          studentId,
          isPrimary: true,
        },
      });

      // If exists, set to non-primary
      if (existingPrimary) {
        await tx.guardianStudent.update({
          where: { id: existingPrimary.id },
          data: { isPrimary: false },
        });
      }

      // Create new link as primary
      const newLink = await tx.guardianStudent.create({
        data: {
          guardianId,
          studentId,
          relationship,
          isPrimary: true,
        },
        include: {
          guardian: {
            select: {
              id: true,
              guardianCode: true,
              fullNameEnglish: true,
              phone: true,
            },
          },
          student: {
            select: {
              id: true,
              studentCode: true,
              fullNameEnglish: true,
            },
          },
        },
      });

      return newLink;
    });
  } else {
    // Simple create without primary logic
    link = await prisma.guardianStudent.create({
      data: {
        guardianId,
        studentId,
        relationship,
        isPrimary: false,
      },
      include: {
        guardian: {
          select: {
            id: true,
            guardianCode: true,
            fullNameEnglish: true,
            phone: true,
          },
        },
        student: {
          select: {
            id: true,
            studentCode: true,
            fullNameEnglish: true,
          },
        },
      },
    });
  }

  return link;
};

/**
 * Get guardian's linked students
 */

const getGuardianStudentsFromDB = async (guardianId, requestingUser) => {
  // Check guardian exists
  const guardian = await prisma.guardian.findUnique({
    where: { id: guardianId },
    select: {
      id: true,
      institutionId: true,
    },
  });

  if (!guardian) {
    throw new AppError(httpStatus.NOT_FOUND, "Guardian not found");
  }

  // Permission check
  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    guardian.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only view guardians in your own institution",
    );
  }

  // Get linked students
  const links = await prisma.guardianStudent.findMany({
    where: { guardianId },
    include: {
      student: {
        select: {
          id: true,
          studentCode: true,
          fullNameEnglish: true,
          fullNameBangla: true,
          profilePhotoUrl: true,
          gender: true,
          enrollments: {
            where: {
              status: "ACTIVE",
            },
            take: 1,
            select: {
              academicYear: true,
              rollNumber: true,
              section: {
                select: {
                  name: true,
                  class: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  // Transform response
  const students = links.map((link) => ({
    id: link.student.id,
    studentCode: link.student.studentCode,
    fullNameEnglish: link.student.fullNameEnglish,
    fullNameBangla: link.student.fullNameBangla,
    profilePhotoUrl: link.student.profilePhotoUrl,
    gender: link.student.gender,
    relationship: link.relationship,
    isPrimary: link.isPrimary,
    currentEnrollment: link.student.enrollments[0] || null,
    linkId: link.id,
  }));

  return students;
};


/**
 * Update guardian-student link (change relationship or primary status)
 */
const updateGuardianStudentLinkIntoDB = async (
  guardianId,
  studentId,
  payload,
  requestingUser
) => {
  // Check link exists
  const existingLink = await prisma.guardianStudent.findUnique({
    where: {
      guardianId_studentId: {
        guardianId,
        studentId,
      },
    },
    include: {
      guardian: {
        select: {
          institutionId: true,
        },
      },
    },
  });

  if (!existingLink) {
    throw new AppError(httpStatus.NOT_FOUND, "Guardian-Student link not found");
  }

  // Permission check
  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    existingLink.guardian.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only update links in your own institution"
    );
  }

  // Handle primary logic if changing to primary
  if (payload.isPrimary === true && !existingLink.isPrimary) {
    // Use transaction
    const updatedLink = await prisma.$transaction(async (tx) => {
      // Find existing primary for this student
      const existingPrimary = await tx.guardianStudent.findFirst({
        where: {
          studentId,
          isPrimary: true,
          id: { not: existingLink.id },
        },
      });

      // Set existing primary to false
      if (existingPrimary) {
        await tx.guardianStudent.update({
          where: { id: existingPrimary.id },
          data: { isPrimary: false },
        });
      }

      // Update current link
      const updated = await tx.guardianStudent.update({
        where: { id: existingLink.id },
        data: payload,
        include: {
          guardian: {
            select: {
              id: true,
              guardianCode: true,
              fullNameEnglish: true,
            },
          },
          student: {
            select: {
              id: true,
              studentCode: true,
              fullNameEnglish: true,
            },
          },
        },
      });

      return updated;
    });

    return updatedLink;
  } else {
    // Simple update
    const updatedLink = await prisma.guardianStudent.update({
      where: { id: existingLink.id },
      data: payload,
      include: {
        guardian: {
          select: {
            id: true,
            guardianCode: true,
            fullNameEnglish: true,
          },
        },
        student: {
          select: {
            id: true,
            studentCode: true,
            fullNameEnglish: true,
          },
        },
      },
    });

    return updatedLink;
  }
};

/**
 * Unlink guardian from student
 * 
 * Critical: Check that student has at least one other guardian
 */
const unlinkGuardianFromStudentIntoDB = async (
  guardianId,
  studentId,
  requestingUser
) => {
  // Check link exists
  const existingLink = await prisma.guardianStudent.findUnique({
    where: {
      guardianId_studentId: {
        guardianId,
        studentId,
      },
    },
    include: {
      guardian: {
        select: {
          id: true,
          guardianCode: true,
          fullNameEnglish: true,
          institutionId: true,
        },
      },
      student: {
        select: {
          id: true,
          studentCode: true,
          fullNameEnglish: true,
        },
      },
    },
  });

  if (!existingLink) {
    throw new AppError(httpStatus.NOT_FOUND, "Guardian-Student link not found");
  }

  // Permission check
  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    existingLink.guardian.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only unlink guardians in your own institution"
    );
  }

  // Check that student has at least one other guardian
  const studentGuardians = await prisma.guardianStudent.count({
    where: { studentId },
  });

  if (studentGuardians <= 1) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Cannot remove last guardian. Student must have at least one guardian."
    );
  }

  // Delete link
  await prisma.guardianStudent.delete({
    where: { id: existingLink.id },
  });

  return {
    guardianId: existingLink.guardian.id,
    guardianCode: existingLink.guardian.guardianCode,
    guardianName: existingLink.guardian.fullNameEnglish,
    studentId: existingLink.student.id,
    studentCode: existingLink.student.studentCode,
    studentName: existingLink.student.fullNameEnglish,
    relationship: existingLink.relationship,
  };
};


export const guardianServices = {
  createGuardianIntoDB,
  getAllGuardiansFromDB,
  getGuardianByIdFromDB,
  getOwnProfileFromDB,
  updateGuardianIntoDB,
  changeGuardianStatusIntoDB,
  linkGuardianToStudentIntoDB,
  getGuardianStudentsFromDB,
  updateGuardianStudentLinkIntoDB,
  unlinkGuardianFromStudentIntoDB
};
