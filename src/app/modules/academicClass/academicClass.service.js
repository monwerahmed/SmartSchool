import httpStatus from "http-status";
import prisma from "../../config/database.js";
import AppError from "../../error/AppError.js";
/**
 * Create a new academic class
 *
 * Flow:
 * 1. Get institutionId from logged-in user's token
 * 2. Check institution exists and is active
 * 3. Check duplicate (same name + institution + year)
 * 4. Create class
 *
 * Access: ADMIN only
 */

const createAcademicClassIntoDB = async (payload, requestingUser) => {
  const { name, academicYear } = payload;

  const institutionId = requestingUser.roles.includes("SUPER_ADMIN")
    ? payload.institutionId
    : requestingUser.institutionId;

  if (!institutionId) {
    throw new AppError(httpStatus.BAD_REQUEST, "Institution ID is required");
  }

  const institution = await prisma.institution.findUnique({
    where: { id: institutionId },
  });

  if (!institution) {
    throw new AppError(httpStatus.NOT_FOUND, "Institution not found");
  }

  if (institution.status !== "ACTIVE") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Cannot create class for inactive institution",
    );
  }

  const existingClass = await prisma.academicClass.findFirst({
    where: {
      name,
      institutionId,
      academicYear,
    },
  });

  if (existingClass) {
    throw new AppError(
      httpStatus.CONFLICT,
      `Class '${name}' already exists for academic year ${academicYear} in this institution`,
    );
  }

  const academicClass = await prisma.academicClass.create({
    data: {
      name,
      academicYear,
      institutionId,
    },
    include: {
      institution: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });

  return academicClass;
};

/**
 * Get all academic classes
 *
 * Features:
 * - Search by name
 * - Filter by academicYear
 * - Filter by institutionId (SUPER_ADMIN only)
 * - Pagination
 * - Auto filter by institution for non-SUPER_ADMIN
 *
 * Access: ADMIN, PRINCIPAL, VICE_PRINCIPAL, TEACHER
 */

const getAllAcademicClassesFromDB = async (requestingUser) => {
  const where = {};

  if (!requestingUser.roles.includes("SUPER_ADMIN")) {
    where.institutionId = requestingUser.institutionId;
  }

  const academicClasses = await prisma.academicClass.findMany({
    where,
    include: {
      institution: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          sections: true,
          classSubjects: true,
        },
      },
    },
    orderBy: [{ academicYear: "desc" }, { name: "asc" }],
  });

  return academicClasses;
};

/**
 * Get single academic class by ID
 *
 * Returns class with:
 * - Institution details
 * - All sections under this class
 * - Section counts
 *
 * Access: ADMIN, PRINCIPAL, VICE_PRINCIPAL, TEACHER
 */

const getSingleAcademicClassFromDB = async (id, requestingUser) => {
  const academicClass = await prisma.academicClass.findUnique({
    where: { id },
    include: {
      institution: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      sections: {
        select: {
          id: true,
          name: true,
          capacity: true,
          shift: true,
        },
      },
      classSubjects: {
        include: {
          subject: {
            select: {
              id: true,
              name: true,
              code: true,
              category: true,
            },
          },
          teacher: {
            select: {
              id: true,
              fullNameEnglish: true,
              teacherCode: true,
            },
          },
        },
      },
    },
  });

  if (!academicClass) {
    throw new AppError(httpStatus.NOT_FOUND, "Academic class not found");
  }

  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    academicClass.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only view academic classes in your own institution",
    );
  }

  return academicClass;
};

/**
 * Update academic class
 *
 * Rules:
 * - Only name can be updated
 * - academicYear cannot be changed
 * - Check duplicate name in same institution + year
 *
 * Access: ADMIN only
 */
const updateAcademicClassIntoDB = async (id, payload, requestingUser) => {
  const existingClass = await prisma.academicClass.findUnique({
    where: { id },
  });

  if (!existingClass) {
    throw new AppError(httpStatus.NOT_FOUND, "Academic class not found");
  }

  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    existingClass.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only update academic classes in your own institution",
    );
  }

  if (payload.name || payload.academicYear) {
    const duplicateCheck = await prisma.academicClass.findFirst({
      where: {
        name: payload.name || existingClass.name,
        academicYear: payload.academicYear || existingClass.academicYear,
        institutionId: existingClass.institutionId,
        id: { not: id },
      },
    });

    if (duplicateCheck) {
      throw new AppError(
        httpStatus.CONFLICT,
        "A class with this name already exists for the specified academic year",
      );
    }
  }

  const updatedClass = await prisma.academicClass.update({
    where: { id },
    data: payload,
    include: {
      institution: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return updatedClass;
};

/**
 * Delete academic class
 *
 * Rules:
 * - Cannot delete if sections exist under this class
 * - Soft delete নেই, hard delete করবো
 *
 * Access: ADMIN only
 */

const deleteAcademicClassFromDB = async (id, requestingUser) => {
  const existingClass = await prisma.academicClass.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          sections: true,
        },
      },
    },
  });

  if (!existingClass) {
    throw new AppError(httpStatus.NOT_FOUND, "Academic class not found");
  }

  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    existingClass.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only delete academic classes in your own institution",
    );
  }

  if (existingClass._count.sections > 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Cannot delete class that has sections. Delete sections first.",
    );
  }

  await prisma.academicClass.delete({
    where: { id },
  });

  return { message: "Academic class deleted successfully" };
};

/**
 * Assign subjects to class (bulk)
 */

const assignSubjectsToClass = async (classId, payload, requestingUser) => {
  const { subjects } = payload;

  // Check class exists
  const academicClass = await prisma.academicClass.findUnique({
    where: { id: classId },
    select: {
      id: true,
      name: true,
      institutionId: true,
      academicYear: true,
    },
  });

  if (!academicClass) {
    throw new AppError(httpStatus.NOT_FOUND, "Academic class not found");
  }

  // Permission check
  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    academicClass.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only manage classes in your own institution",
    );
  }

  // Verify all subjects exist and belong to same institution
  const subjectIds = subjects.map((s) => s.subjectId);
  const existingSubjects = await prisma.subject.findMany({
    where: {
      id: { in: subjectIds },
      institutionId: academicClass.institutionId,
    },
  });

  if (existingSubjects.length !== subjectIds.length) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "One or more subjects not found or do not belong to this institution",
    );
  }

  // Check for duplicates in request
  const duplicateSubjectIds = subjectIds.filter(
    (id, index) => subjectIds.indexOf(id) !== index,
  );

  if (duplicateSubjectIds.length > 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Duplicate subjects in request: ${duplicateSubjectIds.join(", ")}`,
    );
  }

  // Verify teachers if provided
  const teacherIds = subjects
    .filter((s) => s.teacherId)
    .map((s) => s.teacherId);

  if (teacherIds.length > 0) {
    const existingTeachers = await prisma.teacher.findMany({
      where: {
        id: { in: teacherIds },
        institutionId: academicClass.institutionId,
      },
    });

    if (existingTeachers.length !== teacherIds.length) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "One or more teachers not found or do not belong to this institution",
      );
    }
  }

  // Prepare data
  const classSubjectsData = subjects.map((subject) => {
    const subjectData = existingSubjects.find(
      (s) => s.id === subject.subjectId,
    );

    return {
      classId,
      subjectId: subject.subjectId,
      totalMarks: subject.totalMarks || subjectData.defaultTotalMarks,
      passingMarks: subject.passingMarks || subjectData.defaultPassingMarks,
      isCompulsory:
        subject.isCompulsory !== undefined ? subject.isCompulsory : true,
      teacherId: subject.teacherId || null,
    };
  });

  // Bulk create with upsert logic (update if exists)
  const result = await prisma.$transaction(async (tx) => {
    const created = [];

    for (const data of classSubjectsData) {
      const classSubject = await tx.academicClassSubject.upsert({
        where: {
          classId_subjectId: {
            classId: data.classId,
            subjectId: data.subjectId,
          },
        },
        update: {
          totalMarks: data.totalMarks,
          passingMarks: data.passingMarks,
          isCompulsory: data.isCompulsory,
          teacherId: data.teacherId,
        },
        create: data,
        include: {
          subject: {
            select: {
              id: true,
              name: true,
              code: true,
              category: true,
            },
          },
          teacher: {
            select: {
              id: true,
              fullNameEnglish: true,
              teacherCode: true,
            },
          },
        },
      });

      created.push(classSubject);
    }

    return created;
  });

  return {
    classId,
    className: academicClass.name,
    academicYear: academicClass.academicYear,
    totalSubjects: result.length,
    subjects: result,
  };
};

/**
 * Get all subjects in a class
 */

const getClassSubjects = async (classId, requestingUser) => {
  // Check class exists
  const academicClass = await prisma.academicClass.findUnique({
    where: { id: classId },
    select: {
      id: true,
      name: true,
      institutionId: true,
      academicYear: true,
    },
  });

  if (!academicClass) {
    throw new AppError(httpStatus.NOT_FOUND, "Academic class not found");
  }

  // Permission check
  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    academicClass.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only view classes in your own institution",
    );
  }

  // Get class subjects
  const classSubjects = await prisma.academicClassSubject.findMany({
    where: { classId },
    include: {
      subject: {
        select: {
          id: true,
          name: true,
          code: true,
          category: true,
          level: true,
          description: true,
        },
      },
      teacher: {
        select: {
          id: true,
          fullNameEnglish: true,
          teacherCode: true,
          designation: true,
        },
      },
    },
    orderBy: [{ isCompulsory: "desc" }, { subject: { name: "asc" } }],
  });

  // Calculate stats
  const compulsoryCount = classSubjects.filter((cs) => cs.isCompulsory).length;
  const optionalCount = classSubjects.filter((cs) => !cs.isCompulsory).length;

  return {
    classId,
    className: academicClass.name,
    academicYear: academicClass.academicYear,
    totalSubjects: classSubjects.length,
    compulsorySubjects: compulsoryCount,
    optionalSubjects: optionalCount,
    subjects: classSubjects,
  };
};

/**
 * Update class-subject configuration
 */
const updateClassSubject = async (classSubjectId, payload, requestingUser) => {
  // Check class-subject exists
  const existingClassSubject = await prisma.academicClassSubject.findUnique({
    where: { id: classSubjectId },
    include: {
      class: {
        select: {
          institutionId: true,
        },
      },
    },
  });

  if (!existingClassSubject) {
    throw new AppError(httpStatus.NOT_FOUND, "Class-subject mapping not found");
  }

  // Permission check
  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    existingClassSubject.class.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only update class subjects in your own institution",
    );
  }

  // Validate passing marks <= total marks
  const totalMarks = payload.totalMarks || existingClassSubject.totalMarks;
  const passingMarks =
    payload.passingMarks || existingClassSubject.passingMarks;

  if (passingMarks > totalMarks) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Passing marks cannot exceed total marks",
    );
  }

  // If teacher is being assigned, verify teacher exists
  if (payload.teacherId !== undefined && payload.teacherId !== null) {
    const teacher = await prisma.teacher.findFirst({
      where: {
        id: payload.teacherId,
        institutionId: existingClassSubject.class.institutionId,
      },
    });

    if (!teacher) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        "Teacher not found or does not belong to this institution",
      );
    }
  }

  // Update
  const updatedClassSubject = await prisma.academicClassSubject.update({
    where: { id: classSubjectId },
    data: payload,
    include: {
      subject: {
        select: {
          id: true,
          name: true,
          code: true,
          category: true,
        },
      },
      teacher: {
        select: {
          id: true,
          fullNameEnglish: true,
          teacherCode: true,
        },
      },
      class: {
        select: {
          id: true,
          name: true,
          academicYear: true,
        },
      },
    },
  });

  return updatedClassSubject;
};

/**
 * Remove subject from class
 */

const removeClassSubject = async (classSubjectId, requestingUser) => {
  // Check class-subject exists
  const existingClassSubject = await prisma.academicClassSubject.findUnique({
    where: { id: classSubjectId },
    include: {
      class: {
        select: {
          institutionId: true,
          name: true,
        },
      },
      subject: {
        select: {
          name: true,
        },
      },
      _count: {
        select: {
          examSubjects: true,
        },
      },
    },
  });

  if (!existingClassSubject) {
    throw new AppError(httpStatus.NOT_FOUND, "Class-subject mapping not found");
  }

  // Permission check
  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    existingClassSubject.class.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only remove class subjects in your own institution",
    );
  }

  // Check if used in exams
  if (existingClassSubject._count.examSubjects > 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot remove ${existingClassSubject.subject.name} from ${existingClassSubject.class.name}. This subject is used in ${existingClassSubject._count.examSubjects} exam(s).`,
    );
  }

  // Delete
  await prisma.academicClassSubject.delete({
    where: { id: classSubjectId },
  });

  return {
    message: `Subject ${existingClassSubject.subject.name} removed from ${existingClassSubject.class.name} successfully`,
  };
};

/**
 * Assign teacher to class-subject
 */

const assignTeacherToClassSubject = async (
  classSubjectId,
  teacherId,
  requestingUser,
) => {
  // Get class-subject
  const classSubject = await prisma.academicClassSubject.findUnique({
    where: { id: classSubjectId },
    include: {
      class: {
        select: {
          institutionId: true,
          name: true,
        },
      },
      subject: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!classSubject) {
    throw new AppError(httpStatus.NOT_FOUND, "Class-subject mapping not found");
  }

  // Permission check
  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    classSubject.class.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only assign teachers in your own institution",
    );
  }

  // Verify teacher exists and belongs to same institution
  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: {
      id: true,
      fullNameEnglish: true,
      teacherCode: true,
      institutionId: true,
    },
  });

  if (!teacher) {
    throw new AppError(httpStatus.NOT_FOUND, "Teacher not found");
  }

  if (teacher.institutionId !== classSubject.class.institutionId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Teacher does not belong to this institution",
    );
  }

  // Update assignment
  const updated = await prisma.academicClassSubject.update({
    where: { id: classSubjectId },
    data: {
      teacherId,
    },
    include: {
      class: {
        select: {
          id: true,
          name: true,
        },
      },
      subject: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      teacher: {
        select: {
          id: true,
          fullNameEnglish: true,
          teacherCode: true,
          designation: true,
        },
      },
    },
  });

  return {
    id: updated.id,
    class: updated.class,
    subject: updated.subject,
    teacher: updated.teacher,
    totalMarks: updated.totalMarks,
    passingMarks: updated.passingMarks,
    isCompulsory: updated.isCompulsory,
    message: `${teacher.fullNameEnglish} assigned to teach ${classSubject.subject.name} in ${classSubject.class.name}`,
  };
};

/**
 * Remove teacher from class-subject
 */

const removeTeacherFromClassSubject = async (
  classSubjectId,
  requestingUser,
) => {
  // Get class-subject
  const classSubject = await prisma.academicClassSubject.findUnique({
    where: { id: classSubjectId },
    include: {
      class: {
        select: {
          institutionId: true,
          name: true,
        },
      },
      subject: {
        select: {
          name: true,
        },
      },
      teacher: {
        select: {
          fullNameEnglish: true,
        },
      },
    },
  });

  if (!classSubject) {
    throw new AppError(httpStatus.NOT_FOUND, "Class-subject mapping not found");
  }

  // Permission check
  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    classSubject.class.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only manage teachers in your own institution",
    );
  }

  if (!classSubject.teacherId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "No teacher is currently assigned to this class-subject",
    );
  }

  // Remove assignment
  await prisma.academicClassSubject.update({
    where: { id: classSubjectId },
    data: {
      teacherId: null,
    },
  });

  return {
    message: `${classSubject.teacher.fullNameEnglish} removed from teaching ${classSubject.subject.name} in ${classSubject.class.name}`,
  };
};

export const academicClassServices = {
  createAcademicClassIntoDB,
  getAllAcademicClassesFromDB,
  getSingleAcademicClassFromDB,
  updateAcademicClassIntoDB,
  deleteAcademicClassFromDB,
  assignSubjectsToClass,
  getClassSubjects,
  updateClassSubject,
  removeClassSubject,
  assignTeacherToClassSubject,
  removeTeacherFromClassSubject,
};
