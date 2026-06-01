import httpStatus from "http-status";
import prisma from "../../config/database.js";
import AppError from "../../error/AppError.js";
import { hashPassword } from "./user.utils.js";

/**
 * Create an user first fot the system
 */
const createUserIntoDB = async(payload) => {
  // check if email already exists in database or not
  const existingUser = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
  });

  if (existingUser) {
    throw new AppError(
      httpStatus.CONFLICT,
      "User with this email already exists",
    );
  }

   // Check if username already exists
   const existingUsername = await prisma.user.findUnique({
    where: { username: payload.username },
  });

  if (existingUsername) {
    throw new AppError(httpStatus.CONFLICT, "Username already taken");
  }

  const hashedPassword = await hashPassword(payload.password);

  const result = await prisma.user.create({
    data: {
      username: payload.username,
      email: payload.email,
      password: hashedPassword,
    },
    select: {
      id: true,
      username: true,
      email: true,
      isActive: true,
      createdAt: true,
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
  });

  const transformedResult = {
    id: result.id,
    username: result.username,
    email: result.email,
    isActive: result.isActive,
    createdAt: result.createdAt,
    ...(result.userRoles.length > 0 && {
      roles: result.userRoles.map((ur) => ur.role),
    }),
  };
  return transformedResult;


}

/**
 * 
 *Get all the user info
 */
 const getAllUsersFromDB = async () => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      isActive: true,
      createdAt: true,

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
  });

  return users.map((user) => ({
    id: user.id,
    username: user.username,
    email: user.email,
    isActive: user.isActive,
    createdAt: user.createdAt,

    ...(user.userRoles.length > 0 && {
      roles: user.userRoles.map((ur) => ur.role),
    }),
  }));
};

/**
 * Create a super admin 
 */

const createSuperAdminIntoDB = async (payload) => {
  // check if super_admin role exists in database or not
  const superAdminRole = await prisma.role.findUnique({
    where: {
      name: "SUPER_ADMIN",
    },
  });

  if (!superAdminRole) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "SUPER_ADMIN role not found in database. Please run seed first!",
    );
  }

  // check if email already exists in database or not
  const existingUser = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
  });

  if (existingUser) {
    throw new AppError(
      httpStatus.CONFLICT,
      "User with this email already exists",
    );
  }

  // Check if username already exists
  const existingUsername = await prisma.user.findUnique({
    where: { username: payload.username },
  });

  if (existingUsername) {
    throw new AppError(httpStatus.CONFLICT, "Username already taken");
  }

  const hashedPassword = await hashPassword(payload.password);

  const result = await prisma.user.create({
    data: {
      username: payload.username,
      email: payload.email,
      password: hashedPassword,
      institutionId: null,
      userRoles: {
        create: {
          roleId: superAdminRole.id,
        },
      },
    },
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
      createdAt: true,
    },
  });

  const transformedResult = {
    id: result.id,
    username: result.username,
    email: result.email,
    isActive: result.isActive,
    role: result.userRoles.map((ur) => ur.role),
    createdAt: result.createdAt,
  };
  return transformedResult;
};

/**
 * Create Admin for an institution
 * Only SUPER_ADMIN can create Admin
 *
 * Flow:
 * 1. Verify ADMIN role exists
 * 2. Verify institution exists
 * 3. Check email/username uniqueness
 * 4. Hash password
 * 5. Create user with ADMIN role
 */

const createAdminIntoDB = async (payload) => {
  const { username, email, password, institutionId } = payload;

  // check if admin role exists
  const adminRole = await prisma.role.findUnique({
    where: { name: "ADMIN" },
  });

  if (!adminRole) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "ADMIN role not found in database. Please run seed first!",
    );
  }

  // Check if institution exists
  const institution = await prisma.institution.findUnique({
    where: { id: institutionId },
  });
  if (!institution) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Institution not found with the provided ID",
    );
  }
  // Check if institution is active
  if (institution.status !== "ACTIVE") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot create admin for ${institution.status} institution`,
    );
  }
  // Check if email already exists
  const existingEmail = await prisma.user.findUnique({
    where: { email },
  });

  if (existingEmail) {
    throw new AppError(
      httpStatus.CONFLICT,
      "User with this email already exists",
    );
  }

  //  Check if username already exists
  const existingUsername = await prisma.user.findUnique({
    where: { username },
  });
  if (existingUsername) {
    throw new AppError(httpStatus.CONFLICT, "Username already taken");
  }
  //  Hash password
  const hashedPassword = await hashPassword(password);

  // Step 7: Create user with ADMIN role in transaction
  const result = await prisma.user.create({
    data: {
      username,
      email,
      password: hashedPassword,
      institutionId,
      userRoles: {
        create: {
          roleId: adminRole.id,
        },
      },
    },
    select: {
      id: true,
      username: true,
      email: true,
      isActive: true,
      institutionId: true,
      institution: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
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
      createdAt: true,
    },
  });

  // Transform response for cleaner output
  const transformedResult = {
    id: result.id,
    username: result.username,
    email: result.email,
    isActive: result.isActive,
    institutionId: result.institutionId,
    institution: result.institution,
    roles: result.userRoles.map((ur) => ur.role),
    createdAt: result.createdAt,
  };

  return transformedResult;
};

/**
 * Create Principal for an institution
 * SUPER_ADMIN or ADMIN can create Principal
 *
 * Key difference from Admin:
 * - Admin can create Principal for their own institution
 * - institutionId can be auto-filled from logged-in user's institution
 */

const createPrincipalIntoDB = async (payload, requestingUserId) => {
  const { username, email, password, institutionId } = payload;

  // Check if PRINCIPAL role exists
  const principalRole = await prisma.role.findUnique({
    where: { name: "PRINCIPAL" },
  });

  if (!principalRole) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "PRINCIPAL role not found in database. Please run seed first!",
    );
  }

  // Determine institution ID
  let targetInstitutionId = institutionId;

  if (!targetInstitutionId) {
    const requestingUser = await prisma.user.findUnique({
      where: { id: requestingUserId },
      select: { institutionId: true },
    });

    if (!requestingUser?.institutionId) {
      throw new AppError(httpStatus.BAD_REQUEST, "Institution ID is required");
    }
    targetInstitutionId = requestingUser.institutionId;
  }
  //  Check if institution exists
  const institution = await prisma.institution.findUnique({
    where: { id: targetInstitutionId },
  });

  if (!institution) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Institution not found with the provided ID",
    );
  }
  //  Check if institution is active
  if (institution.status !== "ACTIVE") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot create principal for ${institution.status} institution`,
    );
  }
  // Check if email already exists
  const existingEmail = await prisma.user.findUnique({
    where: { email },
  });

  if (existingEmail) {
    throw new AppError(
      httpStatus.CONFLICT,
      "User with this email already exists",
    );
  }

  //  Check if username already exists
  const existingUsername = await prisma.user.findUnique({
    where: { username },
  });

  if (existingUsername) {
    throw new AppError(httpStatus.CONFLICT, "Username already taken");
  }

  //  Hash password
  const hashedPassword = await hashPassword(password);

  //  Create user with PRINCIPAL role
  const result = await prisma.user.create({
    data: {
      username,
      email,
      password: hashedPassword,
      institutionId: targetInstitutionId,
      userRoles: {
        create: {
          roleId: principalRole.id,
        },
      },
    },
    select: {
      id: true,
      username: true,
      email: true,
      isActive: true,
      institutionId: true,
      institution: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
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
      createdAt: true,
    },
  });

  // Transform response
  const transformedResult = {
    id: result.id,
    username: result.username,
    email: result.email,
    isActive: result.isActive,
    institutionId: result.institutionId,
    institution: result.institution,
    roles: result.userRoles.map((ur) => ur.role),
    createdAt: result.createdAt,
  };

  return transformedResult;
};
export const userServices = {
  createSuperAdminIntoDB,
  createAdminIntoDB,
  createPrincipalIntoDB,
  createUserIntoDB,
  getAllUsersFromDB,
};
