import prisma from "../../config/database.js";
import AppError from "../../error/AppError.js";
import httpStatus from "http-status";
import { comparePassword } from "../user/user.utils.js";
import { jwtHelpers } from "../../utils/jwtHelpers.js";
import { USER_TYPE_CONFIG } from "../upload/upload.service.js";

const loginUserFromDB = async (payload) => {
  const user = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
    include: {
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
      student: {
        select: {
          id: true,
          studentCode: true,
          fullNameEnglish: true,
        },
      },
      teacher: {
        select: {
          id: true,
          teacherCode: true,
          fullNameEnglish: true,
          department: true,
        },
      },
      guardian: {
        select: {
          id: true,
          guardianCode: true,
          fullNameEnglish: true,
        },
      },
    },
  });

  // Check if user exists
  if (!user) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "User not found! Please check your email",
    );
  }

  // Verify password
  const isPasswordMatched = await comparePassword(
    payload.password,
    user.password,
  );

  if (!isPasswordMatched) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Invalid credentials! Please check your password",
    );
  }

  //  Extract roles from userRoles
  const roles = user.userRoles.map((ur) => ur.role.name);

  //  Generate access token with multiple roles
  const accessToken = jwtHelpers.createToken(
    {
      userId: user.id,
      roles: roles, // Array of role names
      email: user.email,
      institutionId: user.institutionId,
      isFirstLogin: user.isFirstLogin,
    },
    process.env.JWT_ACCESS_SECRET,
    "1d", 
  );

  if (user.isFirstLogin) {
    await prisma.user.update({
      where: { id: user.id },
      data: { isFirstLogin: false },
    });
  }

  // Generate refresh token (optional, for future)
  const refreshToken = jwtHelpers.createToken(
    {
      userId: user.id,
      email: user.email,
    },
    process.env.JWT_REFRESH_SECRET,
    "7d",
  );

  //get profile photo link
  //console.log("user Id: ", user.id, roles);
  // console.log("roles =", roles);
  // console.log("type =", typeof roles);
  
  let role = roles?.[0]?.toLowerCase();
  console.log("Role : ",role);
  if(role === "parent") role = "guardian";
  const config = USER_TYPE_CONFIG[role];
  console.log("Config: ", config);
  let profile = null;
  //const profile = await config.findByUserId(user.id);
  if(config?.findByUserId){
    profile = await config.findByUserId(user.id);
  }
  //const safeProfile = profile || {};
  console.log("Profile : ", profile);
  
  // prepare user data for response

  const userData = {
    id: user.id,
    username: user.username,
    email: user.email,
    isActive: user.isActive,
    roles: user.userRoles.map((ur) => ({
      id: ur.role.id,
      name: ur.role.name,
      description: ur.role.description,
    })),
    institutionId: user.institutionId,

    //merging profile photo link with the response
    profilePhoto: profile?.profilePhotoUrl
      ? { url: profile.profilePhotoUrl }
      : null,
  };

  // it will return token and user info
  return {
    accessToken,
    refreshToken,
    user: userData,
  };
};

const logoutUserFromDB = async()=>{
  return {};
}

export const authService = {
  loginUserFromDB,
  logoutUserFromDB
};
