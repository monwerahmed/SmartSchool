// ============================================================
// src/modules/upload/upload.service.js
// ============================================================
import prisma from "../../config/database.js";
import AppError from "../../error/AppError.js";
import httpStatus from "http-status";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
  getResourceType,
  buildFolderPath,
  buildPublicId,
} from "../../utils/cloudinaryHelper.js";

// ============================================================
// USER TYPE CONFIG
// Maps role/profile type to Prisma model and folder name
// ============================================================
export const USER_TYPE_CONFIG = {
  student: {
    model: "student",
    folder: "students",
    findByUserId: (userId) =>
      prisma.student.findUnique({
        where: { userId },
        select: {
          id: true,
          fullNameEnglish: true,
          profilePhotoUrl: true,
          profilePhotoId: true,
          documentFileUrl: true,
          documentFileId: true,
          documentFileType: true,
          institutionId: true,
        },
      }),
  },
  teacher: {
    model: "teacher",
    folder: "teachers",
    findByUserId: (userId) =>
      prisma.teacher.findUnique({
        where: { userId },
        select: {
          id: true,
          fullNameEnglish: true,
          profilePhotoUrl: true,
          profilePhotoId: true,
          documentFileUrl: true,
          documentFileId: true,
          documentFileType: true,
          institutionId: true,
        },
      }),
  },
  guardian: {
    model: "guardian",
    folder: "guardians",
    findByUserId: (userId) =>
      prisma.guardian.findUnique({
        where: { userId },
        select: {
          id: true,
          fullNameEnglish: true,
          profilePhotoUrl: true,
          profilePhotoId: true,
          documentFileUrl: true,
          documentFileId: true,
          documentFileType: true,
          institutionId: true,
        },
      }),
  },
  librarian: {
    model: "librarian",
    folder: "librarians",
    findByUserId: (userId) =>
      prisma.librarian.findUnique({
        where: { userId },
        select: {
          id: true,
          fullNameEnglish: true,
          profilePhotoUrl: true,
          profilePhotoId: true,
          documentFileUrl: true,
          documentFileId: true,
          documentFileType: true,
          institutionId: true,
        },
      }),
  },
};

// ============================================================
// RESOLVE USER TYPE FROM ROLES
// ============================================================
const resolveUserType = (roles) => {
  if (roles.includes("STUDENT")) return "student";
  if (roles.includes("TEACHER")) return "teacher";
  if (roles.includes("GUARDIAN")) return "guardian";
  if (roles.includes("LIBRARIAN")) return "librarian";
  if (roles.includes("ADMIN")) return "admin";
  return null;
};

// ============================================================
// UPLOAD PROFILE PHOTO
// POST /api/uploads/profile-photo
// ============================================================
const uploadProfilePhotoService = async (file, requestingUser) => {
  if (!file) {
    throw new AppError(httpStatus.BAD_REQUEST, "No profile photo file provided");
  }

  const userType = resolveUserType(requestingUser.roles);
  if (!userType) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Profile photo upload is not available for your role"
    );
  }

  const config = USER_TYPE_CONFIG[userType];
  const profile = await config.findByUserId(requestingUser.userId);

  if (!profile) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Profile not found. Please contact your administrator."
    );
  }

  //console.log("File : ", file);
  const folder = buildFolderPath(config.folder, "photos");
  const publicId = buildPublicId(config.folder, profile.id, "photos");

  //console.log("PublicId : ", publicId);

  //console.log("ProfilePhoto Id : ", profile.profilePhotoId)

  // Delete old photo from Cloudinary if exists (replace flow)
  if (profile.profilePhotoId) {
    await deleteFromCloudinary(profile.profilePhotoId, "image");
  }

  // Upload new photo
  //console.log(file.buffer, folder, publicId);
  const { url, publicId: newPublicId } = await uploadToCloudinary(
    file.buffer,
    folder,
    publicId,
    "image"
  );

  // Save URL and publicId to DB
  const updated = await prisma[config.model].update({
    where: { id: profile.id },
    data: {
      profilePhotoUrl: url,
      profilePhotoId: newPublicId,
    },
    select: {
      id: true,
      fullNameEnglish: true,
      profilePhotoUrl: true,
    },
  });

  return {
    message: "Profile photo uploaded successfully",
    profilePhotoUrl: updated.profilePhotoUrl,
    profile: updated,
  };
};

// ============================================================
// UPLOAD DOCUMENT FILE
// POST /api/uploads/document
// ============================================================
const uploadDocumentService = async (file, documentType, requestingUser) => {
  if (!file) {
    throw new AppError(httpStatus.BAD_REQUEST, "No document file provided");
  }

  const userType = resolveUserType(requestingUser.roles);
  if (!userType) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Document upload is not available for your role"
    );
  }

  const config = USER_TYPE_CONFIG[userType];
  const profile = await config.findByUserId(requestingUser.userId);

  if (!profile) {
    throw new AppError(httpStatus.NOT_FOUND, "Profile not found.");
  }

  console.log("Mime Type : ", file.mimetype);
  const resourceType = getResourceType(file.mimetype);
  console.log("ResourceType : ", resourceType);
  const folder = buildFolderPath(config.folder, "documents");
  const publicId = buildPublicId(config.folder, profile.id, "documents");
  console.log("publicId : ", publicId);

  // Delete old document from Cloudinary if exists
  if (profile.documentFileId) {
    //const oldResourceType = profile.documentFileUrl?.includes(".pdf")
    const oldResourceType = profile.documentFileUrl?.toLowerCase().endsWith(".jpg")
      ? "image"
      : "raw";
    //const oldResourceType = "raw";
    console.log("oldResourceType : ", oldResourceType, "resourceUrl : ", profile.documentFileUrl);

      //console.log("Old Resource Type : ", oldResourceType);
    await deleteFromCloudinary(profile.documentFileId, oldResourceType);
  }

  // Upload new document
  const { url, publicId: newPublicId } = await uploadToCloudinary(
    file.buffer,
    folder,
    publicId,
    resourceType
  );

  // Save to DB
  console.log("Working properly")
  const updated = await prisma[config.model].update({
    where: { id: profile.id },
    data: {
      documentFileUrl: url,
      documentFileId: newPublicId,
      documentFileType: documentType || "Document",
    },
    select: {
      id: true,
      fullNameEnglish: true,
      documentFileUrl: true,
      documentFileType: true,
    },
  });

  return {
    message: "Document uploaded successfully",
    documentFileUrl: updated.documentFileUrl,
    documentFileType: updated.documentFileType,
    profile: updated,
  };
};

// ============================================================
// UPLOAD BOTH (profile photo + document in one request)
// POST /api/uploads/both
// ============================================================
const uploadBothService = async (files, documentType, requestingUser) => {
  const profilePhotoFile = files?.profilePhoto?.[0];
  const documentFile = files?.documentFile?.[0];

  if (!profilePhotoFile && !documentFile) {
    throw new AppError(httpStatus.BAD_REQUEST, "No files provided");
  }

  const userType = resolveUserType(requestingUser.roles);
  if (!userType) {
    throw new AppError(httpStatus.FORBIDDEN, "File upload not available for your role");
  }

  const config = USER_TYPE_CONFIG[userType];
  const profile = await config.findByUserId(requestingUser.userId);

  if (!profile) {
    throw new AppError(httpStatus.NOT_FOUND, "Profile not found.");
  }

  const updateData = {};
  const result = {};

  // Handle profile photo
  if (profilePhotoFile) {
    if (profile.profilePhotoId) {
      await deleteFromCloudinary(profile.profilePhotoId, "image");
    }

    const folder = buildFolderPath(config.folder, "photos");
    const publicId = buildPublicId(config.folder, profile.id, "photos");

    const { url, publicId: newPublicId } = await uploadToCloudinary(
      profilePhotoFile.buffer,
      folder,
      publicId,
      "image"
    );

    updateData.profilePhotoUrl = url;
    updateData.profilePhotoId = newPublicId;
    result.profilePhotoUrl = url;
  }

  // Handle document
  if (documentFile) {
    if (profile.documentFileId) {
      const oldResourceType = profile.documentFileUrl?.includes(".jpg")
        ? "image"
        : "raw";

      await deleteFromCloudinary(profile.documentFileId, oldResourceType);
    }

    const resourceType = getResourceType(documentFile.mimetype);
    const folder = buildFolderPath(config.folder, "documents");
    const publicId = buildPublicId(config.folder, profile.id, "documents");

    const { url, publicId: newPublicId } = await uploadToCloudinary(
      documentFile.buffer,
      folder,
      publicId,
      resourceType
    );

    updateData.documentFileUrl = url;
    updateData.documentFileId = newPublicId;
    updateData.documentFileType = documentType || "Document";
    result.documentFileUrl = url;
    result.documentFileType = documentType || "Document";
  }

  // Single DB update for both
  await prisma[config.model].update({
    where: { id: profile.id },
    data: updateData,
  });

  return {
    message: "Files uploaded successfully",
    ...result,
  };
};

// ============================================================
// DELETE PROFILE PHOTO
// DELETE /api/uploads/profile-photo
// ============================================================
const deleteProfilePhotoService = async (requestingUser) => {
  const userType = resolveUserType(requestingUser.roles);
  if (!userType) {
    throw new AppError(httpStatus.FORBIDDEN, "Not available for your role");
  }

  const config = USER_TYPE_CONFIG[userType];
  const profile = await config.findByUserId(requestingUser.userId);

  if (!profile) {
    throw new AppError(httpStatus.NOT_FOUND, "Profile not found");
  }

  if (!profile.profilePhotoId) {
    throw new AppError(httpStatus.BAD_REQUEST, "No profile photo to delete");
  }

  await deleteFromCloudinary(profile.profilePhotoId, "image");

  await prisma[config.model].update({
    where: { id: profile.id },
    data: {
      profilePhotoUrl: null,
      profilePhotoId: null,
    },
  });

  return { message: "Profile photo deleted successfully" };
};

// ============================================================
// DELETE DOCUMENT
// DELETE /api/uploads/document
// ============================================================
const deleteDocumentService = async (requestingUser) => {
  const userType = resolveUserType(requestingUser.roles);
  if (!userType) {
    throw new AppError(httpStatus.FORBIDDEN, "Not available for your role");
  }

  const config = USER_TYPE_CONFIG[userType];
  const profile = await config.findByUserId(requestingUser.userId);

  if (!profile) {
    throw new AppError(httpStatus.NOT_FOUND, "Profile not found");
  }

  if (!profile.documentFileId) {
    throw new AppError(httpStatus.BAD_REQUEST, "No document to delete");
  }

  const resourceType = profile.documentFileUrl?.includes(".jpg") ? "image" : "raw";
  //const resourceType = profile.documentFileUrl?.toLowerCase().endsWith(".pdf")
  //resourceType = "raw";

  console.log("documentFileId :",profile.documentFileUrl, "resourceType:", resourceType);
  await deleteFromCloudinary(profile.documentFileId, resourceType);

  await prisma[config.model].update({
    where: { id: profile.id },
    data: {
      documentFileUrl: null,
      documentFileId: null,
      documentFileType: null,
    },
  });

  return { message: "Document deleted successfully" };
};

// ============================================================
// GET OWN FILES (any logged-in user sees their own)
// GET /api/uploads/me
// ============================================================
const getOwnFilesService = async (requestingUser) => {
  const userType = resolveUserType(requestingUser.roles);
  if (!userType) {
    throw new AppError(httpStatus.FORBIDDEN, "Not available for your role");
  }

  const config = USER_TYPE_CONFIG[userType];
  const profile = await config.findByUserId(requestingUser.userId);

  if (!profile) {
    throw new AppError(httpStatus.NOT_FOUND, "Profile not found");
  }

  return {
    id: profile.id,
    fullNameEnglish: profile.fullNameEnglish,
    profilePhoto: profile.profilePhotoUrl
      ? { url: profile.profilePhotoUrl }
      : null,
    document: profile.documentFileUrl
      ? {
          url: profile.documentFileUrl,
          type: profile.documentFileType,
        }
      : null,
  };
};

// ============================================================
// GET FILES BY ID (admin/principal/teacher views a single user)
// GET /api/uploads/:userType/:id
// ============================================================
const getFilesByIdService = async (userType, profileId, requestingUser) => {
  if (!USER_TYPE_CONFIG[userType]) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Invalid user type. Must be student, teacher, guardian, or librarian"
    );
  }

  const profile = await prisma[USER_TYPE_CONFIG[userType].model].findUnique({
    where: { id: profileId },
    select: {
      id: true,
      fullNameEnglish: true,
      profilePhotoUrl: true,
      documentFileUrl: true,
      documentFileType: true,
      institutionId: true,
    },
  });

  if (!profile) {
    throw new AppError(httpStatus.NOT_FOUND, `${userType} not found`);
  }

  // Institution check
  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    profile.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only view files for users in your own institution"
    );
  }

  return {
    id: profile.id,
    fullNameEnglish: profile.fullNameEnglish,
    profilePhoto: profile.profilePhotoUrl
      ? { url: profile.profilePhotoUrl }
      : null,
    document: profile.documentFileUrl
      ? {
          url: profile.documentFileUrl,
          type: profile.documentFileType,
        }
      : null,
  };
};

// ============================================================
// GET ALL FILES (admin sees everyone in the institution)
// GET /api/uploads/:userType
// ============================================================
const getAllFilesService = async (userType, query, requestingUser) => {
  if (!USER_TYPE_CONFIG[userType]) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Invalid user type. Must be student, teacher, guardian, or librarian"
    );
  }

  const { page = 1, limit = 10, hasPhoto, hasDocument } = query;

  const where = {};

  // Non-super-admins only see their institution
  if (!requestingUser.roles.includes("SUPER_ADMIN")) {
    where.institutionId = requestingUser.institutionId;
  } else if (query.institutionId) {
    where.institutionId = query.institutionId;
  }

  // Optional filters
  if (hasPhoto === "true") where.profilePhotoUrl = { not: null };
  if (hasPhoto === "false") where.profilePhotoUrl = null;
  if (hasDocument === "true") where.documentFileUrl = { not: null };
  if (hasDocument === "false") where.documentFileUrl = null;

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const [profiles, total] = await Promise.all([
    prisma[USER_TYPE_CONFIG[userType].model].findMany({
      where,
      skip,
      take,
      orderBy: { fullNameEnglish: "asc" },
      select: {
        id: true,
        fullNameEnglish: true,
        profilePhotoUrl: true,
        documentFileUrl: true,
        documentFileType: true,
      },
    }),
    prisma[USER_TYPE_CONFIG[userType].model].count({ where }),
  ]);

  return {
    data: profiles.map((p) => ({
      id: p.id,
      fullNameEnglish: p.fullNameEnglish,
      profilePhoto: p.profilePhotoUrl ? { url: p.profilePhotoUrl } : null,
      document: p.documentFileUrl
        ? { url: p.documentFileUrl, type: p.documentFileType }
        : null,
    })),
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

export const uploadServices = {
  uploadProfilePhotoService,
  uploadDocumentService,
  uploadBothService,
  deleteProfilePhotoService,
  deleteDocumentService,
  getOwnFilesService,
  getFilesByIdService,
  getAllFilesService,
};