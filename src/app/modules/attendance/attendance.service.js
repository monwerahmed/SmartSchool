import prisma from "../../config/database.js";
import AppError from "../../error/AppError.js";
import httpStatus from "http-status";
import {
  validateAttendanceDate,
  calculatePercentage,
  getAttendanceStatusCategory,
} from "./attendance.utils.js";

/**
 * Mark single attendance
 */

const markAttendanceIntoDB = async (payload, requestingUser) => {
  const { studentId, date, status, remarks } = payload;

  // Validate date
  const dateValidation = validateAttendanceDate(date);
  if (!dateValidation.valid) {
    throw new AppError(httpStatus.BAD_REQUEST, dateValidation.message);
  }

  // Check student exists and get current enrollment
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      enrollments: {
        where: { status: "ACTIVE" },
        take: 1,
        include: {
          section: {
            select: {
              id: true,
              name: true,
              institutionId: true,
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
  });

  if (!student) {
    throw new AppError(httpStatus.NOT_FOUND, "Student not found");
  }

  if (student.enrollments.length === 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Student is not enrolled in any section",
    );
  }

  const currentEnrollment = student.enrollments[0];
  const sectionId = currentEnrollment.sectionId;
  const institutionId = currentEnrollment.section.institutionId;

  // Permission check - same institution
  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only mark attendance for students in your own institution",
    );
  }
  // Check if already marked
  const existingAttendance = await prisma.attendance.findUnique({
    where: {
      studentId_date: {
        studentId,
        date: new Date(date),
      },
    },
  });

  if (existingAttendance) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Attendance already marked for this student on this date. Use update endpoint to modify.",
    );
  }

  // Step 5: Create attendance
  const attendance = await prisma.attendance.create({
    data: {
      studentId,
      sectionId,
      date: new Date(date),
      status,
      remarks,
      markedById: requestingUser.userId,
      institutionId,
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
        select: {
          id: true,
          name: true,
          class: {
            select: {
              name: true,
            },
          },
        },
      },
      markedBy: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  return attendance;
};

/**
 * Mark bulk attendance for entire section
 */

const markBulkAttendanceIntoDB = async (payload, requestingUser) => {
  const { sectionId, date, attendances } = payload;

  // Step 1: Validate date
  const dateValidation = validateAttendanceDate(date);
  if (!dateValidation.valid) {
    throw new AppError(httpStatus.BAD_REQUEST, dateValidation.message);
  }

  // Step 2: Check section exists
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    select: {
      id: true,
      name: true,
      institutionId: true,
      class: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!section) {
    throw new AppError(httpStatus.NOT_FOUND, "Section not found");
  }

  // Step 3: Permission check
  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    section.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only mark attendance for sections in your own institution",
    );
  }

  // Step 4: Get all enrolled students in this section
  const enrolledStudents = await prisma.studentEnrollment.findMany({
    where: {
      sectionId,
      status: "ACTIVE",
    },
    select: {
      studentId: true,
    },
  });

  const validStudentIds = enrolledStudents.map((e) => e.studentId);

  // Step 5: Validate all student IDs
  const requestedStudentIds = attendances.map((a) => a.studentId);
  const invalidIds = requestedStudentIds.filter(
    (id) => !validStudentIds.includes(id),
  );

  if (invalidIds.length > 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Invalid student IDs: ${invalidIds.join(", ")}. These students are not enrolled in this section.`,
    );
  }

  // Step 6: Check for duplicates in request
  const duplicateIds = requestedStudentIds.filter(
    (id, index) => requestedStudentIds.indexOf(id) !== index,
  );

  if (duplicateIds.length > 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Duplicate student IDs in request: ${duplicateIds.join(", ")}`,
    );
  }

  // Step 7: Check if already marked for this date
  const existingAttendances = await prisma.attendance.findMany({
    where: {
      sectionId,
      date: new Date(date),
    },
    select: {
      studentId: true,
    },
  });

  if (existingAttendances.length > 0) {
    throw new AppError(
      httpStatus.CONFLICT,
      `Attendance already marked for ${existingAttendances.length} student(s) in this section on this date`,
    );
  }

  // Step 8: Prepare attendance records
  const attendanceRecords = attendances.map((a) => ({
    studentId: a.studentId,
    sectionId,
    date: new Date(date),
    status: a.status,
    remarks: a.remarks || null,
    markedById: requestingUser.userId,
    institutionId: section.institutionId,
  }));

  // Step 9: Bulk insert in transaction
  const result = await prisma.$transaction(async (tx) => {
    const created = await tx.attendance.createMany({
      data: attendanceRecords,
      skipDuplicates: false,
    });

    return created;
  });

  // Step 10: Calculate summary
  const summary = {
    present: attendanceRecords.filter((a) => a.status === "PRESENT").length,
    absent: attendanceRecords.filter((a) => a.status === "ABSENT").length,
    late: attendanceRecords.filter((a) => a.status === "LATE").length,
    leave: attendanceRecords.filter((a) => a.status === "LEAVE").length,
  };

  return {
    date,
    sectionId,
    sectionName: `${section.class.name} - ${section.name}`,
    totalMarked: result.count,
    summary,
  };
};

/**
 * Get attendance by section and date
 */

const getAttendanceBySectionAndDateFromDB = async (
  sectionId,
  date,
  requestingUser,
) => {
  // Check section exists
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    select: {
      id: true,
      name: true,
      institutionId: true,
      class: {
        select: {
          name: true,
        },
      },
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
      "You can only view attendance for sections in your own institution",
    );
  }

  // Get attendance records
  const attendances = await prisma.attendance.findMany({
    where: {
      sectionId,
      date: new Date(date),
    },
    include: {
      student: {
        select: {
          id: true,
          studentCode: true,
          fullNameEnglish: true,
        },
      },
      markedBy: {
        select: {
          id: true,
          username: true,
        },
      },
    },
    orderBy: {
      student: {
        studentCode: "asc",
      },
    },
  });

  return {
    date,
    sectionId,
    sectionName: `${section.class.name} - ${section.name}`,
    totalMarked: attendances.length,
    attendances,
  };
};

/**
 * Get student attendance history
 */

const getStudentAttendanceHistoryFromDB = async (
  studentId,
  query,
  requestingUser,
) => {
  // Check student exists
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

  // Build date range
  let startDate, endDate;

  if (query.month && query.year) {
    // Monthly view
    const month = parseInt(query.month);
    const year = parseInt(query.year);
    startDate = new Date(year, month - 1, 1);
    endDate = new Date(year, month, 0); // Last day of month
  } else if (query.startDate && query.endDate) {
    // Custom range
    startDate = new Date(query.startDate);
    endDate = new Date(query.endDate);
  } else {
    // Default: Current month
    const now = new Date();
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }

  // Get attendance records
  const records = await prisma.attendance.findMany({
    where: {
      studentId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
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
    orderBy: {
      date: "asc",
    },
  });

  // Calculate statistics
  const totalDays = records.length;
  const presentCount = records.filter(
    (r) =>
      r.status === "PRESENT" || r.status === "LATE" || r.status === "LEAVE",
  ).length;
  const absentCount = records.filter((r) => r.status === "ABSENT").length;
  const lateCount = records.filter((r) => r.status === "LATE").length;
  const leaveCount = records.filter((r) => r.status === "LEAVE").length;

  const percentage = calculatePercentage(presentCount, totalDays);
  const statusCategory = getAttendanceStatusCategory(percentage);

  return {
    student: {
      id: student.id,
      studentCode: student.studentCode,
      fullNameEnglish: student.fullNameEnglish,
    },
    period: {
      startDate,
      endDate,
    },
    statistics: {
      totalDays,
      present: presentCount,
      absent: absentCount,
      late: lateCount,
      leave: leaveCount,
      percentage,
      status: statusCategory,
    },
    records: records.map((r) => ({
      date: r.date,
      status: r.status,
      remarks: r.remarks,
      section: `${r.section.class.name} - ${r.section.name}`,
    })),
  };
};

/**
 * Get section attendance report (monthly)
 */
const getSectionAttendanceReportFromDB = async (
  sectionId,
  query,
  requestingUser,
) => {
  // Check section exists
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    select: {
      id: true,
      name: true,
      institutionId: true,
      class: {
        select: {
          name: true,
        },
      },
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
      "You can only view reports for sections in your own institution",
    );
  }

  // Build date range
  let startDate, endDate;

  if (query.month && query.year) {
    const month = parseInt(query.month);
    const year = parseInt(query.year);
    startDate = new Date(year, month - 1, 1);
    endDate = new Date(year, month, 0);
  } else {
    const now = new Date();
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }

  // Get all enrolled students
  const enrolledStudents = await prisma.studentEnrollment.findMany({
    where: {
      sectionId,
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
    },
  });

  // Get attendance records for this period
  const attendanceRecords = await prisma.attendance.findMany({
    where: {
      sectionId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  // Group by student
  const studentAttendance = enrolledStudents.map((enrollment) => {
    const studentRecords = attendanceRecords.filter(
      (r) => r.studentId === enrollment.studentId,
    );

    const totalDays = studentRecords.length;
    const presentCount = studentRecords.filter(
      (r) =>
        r.status === "PRESENT" || r.status === "LATE" || r.status === "LEAVE",
    ).length;
    const absentCount = studentRecords.filter(
      (r) => r.status === "ABSENT",
    ).length;
    const lateCount = studentRecords.filter((r) => r.status === "LATE").length;

    const percentage = calculatePercentage(presentCount, totalDays);
    const statusCategory = getAttendanceStatusCategory(percentage);

    return {
      studentId: enrollment.student.id,
      studentCode: enrollment.student.studentCode,
      studentName: enrollment.student.fullNameEnglish,
      rollNumber: enrollment.rollNumber,
      totalDays,
      present: presentCount,
      absent: absentCount,
      late: lateCount,
      percentage,
      status: statusCategory,
    };
  });

  // Calculate section average
  const totalPercentages = studentAttendance.reduce(
    (sum, s) => sum + s.percentage,
    0,
  );
  const sectionAverage =
    studentAttendance.length > 0
      ? Math.round((totalPercentages / studentAttendance.length) * 100) / 100
      : 0;

  return {
    sectionId,
    sectionName: `${section.class.name} - ${section.name}`,
    period: {
      startDate,
      endDate,
    },
    sectionAverage,
    students: studentAttendance,
  };
};

/**
 * Update attendance
 */

const updateAttendanceIntoDB = async (id, payload, requestingUser) => {
  // Check attendance exists
  const existingAttendance = await prisma.attendance.findUnique({
    where: { id },
    include: {
      section: {
        select: {
          institutionId: true,
        },
      },
    },
  });

  if (!existingAttendance) {
    throw new AppError(httpStatus.NOT_FOUND, "Attendance record not found");
  }

  // Permission check
  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    existingAttendance.section.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only update attendance in your own institution",
    );
  }

  // Check if date is too old (prevent backdating beyond 2 days)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const attendanceDate = new Date(existingAttendance.date);
  attendanceDate.setHours(0, 0, 0, 0);
  const diffTime = today - attendanceDate;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (!requestingUser.roles.includes("SUPER_ADMIN") && diffDays > 2) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Can only update attendance for today or yesterday. Contact admin for older records.",
    );
  }

  // Update attendance
  const updatedAttendance = await prisma.attendance.update({
    where: { id },
    data: payload,
    include: {
      student: {
        select: {
          id: true,
          studentCode: true,
          fullNameEnglish: true,
        },
      },
      section: {
        select: {
          id: true,
          name: true,
          class: {
            select: {
              name: true,
            },
          },
        },
      },
      markedBy: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  return updatedAttendance;
};

/**
 * Get today's attendance summary
 */

const getTodaySummaryFromDB = async (requestingUser) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build where clause
  const where = {
    date: today,
  };

  // Filter by institution for non-SUPER_ADMIN
  if (!requestingUser.roles.includes("SUPER_ADMIN")) {
    where.institutionId = requestingUser.institutionId;
  }

  // Get today's attendance
  const todayAttendance = await prisma.attendance.findMany({
    where,
    select: {
      status: true,
      sectionId: true,
    },
  });

  // Get total students in institution
  const totalStudentsWhere = {};
  if (!requestingUser.roles.includes("SUPER_ADMIN")) {
    totalStudentsWhere.institutionId = requestingUser.institutionId;
  }

  const totalStudents = await prisma.student.count({
    where: totalStudentsWhere,
  });

  // Calculate summary
  const markedStudents = todayAttendance.length;
  const presentCount = todayAttendance.filter(
    (a) => a.status === "PRESENT",
  ).length;
  const absentCount = todayAttendance.filter(
    (a) => a.status === "ABSENT",
  ).length;
  const lateCount = todayAttendance.filter((a) => a.status === "LATE").length;
  const leaveCount = todayAttendance.filter((a) => a.status === "LEAVE").length;

  // Get sections that haven't marked attendance yet
  const markedSectionIds = [
    ...new Set(todayAttendance.map((a) => a.sectionId)),
  ];

  const pendingSections = await prisma.section.findMany({
    where: {
      id: {
        notIn: markedSectionIds,
      },
      institutionId: !requestingUser.roles.includes("SUPER_ADMIN")
        ? requestingUser.institutionId
        : undefined,
    },
    select: {
      id: true,
      name: true,
      class: {
        select: {
          name: true,
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

  const percentage = calculatePercentage(markedStudents, totalStudents);

  return {
    date: today,
    institutionId: requestingUser.institutionId,
    totalStudents,
    markedStudents,
    pendingSections: pendingSections.map((s) => ({
      sectionId: s.id,
      sectionName: `${s.class.name} - ${s.name}`,
      studentCount: s._count.enrollments,
    })),
    summary: {
      present: presentCount,
      absent: absentCount,
      late: lateCount,
      leave: leaveCount,
    },
    percentage,
  };
};

export const attendanceServices = {
  markAttendanceIntoDB,
  markBulkAttendanceIntoDB,
  getAttendanceBySectionAndDateFromDB,
  getStudentAttendanceHistoryFromDB,
  getSectionAttendanceReportFromDB,
  updateAttendanceIntoDB,
  getTodaySummaryFromDB,
};
