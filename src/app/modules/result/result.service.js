import prisma from "../../config/database.js";
import AppError from "../../error/AppError.js";
import httpStatus from "http-status";
import {
  calculateGrade,
  validateMarks,
  calculateOverallResult,
  formatResultStatistics,
  calculatePercentage,
} from "./result.utils.js";

// ========================================
// SUBJECT OPERATIONS
// ========================================

/**
 * Create Subject
 */
const createSubjectIntoDB = async (payload, requestingUser) => {
  const {
    name,
    code,
    defaultTotalMarks = 100,
    defaultPassingMarks = 33,
    category = "GENERAL",
    level = "SECONDARY",
    description,
  } = payload;

  // Get institution ID
  const institutionId = requestingUser.roles.includes("SUPER_ADMIN")
    ? payload.institutionId
    : requestingUser.institutionId;

  if (!institutionId) {
    throw new AppError(httpStatus.BAD_REQUEST, "Institution ID is required");
  }

  // Check if subject code already exists in this institution
  const existingSubject = await prisma.subject.findFirst({
    where: {
      code,
      institutionId,
    },
  });

  if (existingSubject) {
    throw new AppError(
      httpStatus.CONFLICT,
      `Subject with code '${code}' already exists in this institution`,
    );
  }

  // Validate passing marks
  if (defaultPassingMarks > defaultTotalMarks) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Passing marks cannot exceed total marks",
    );
  }

  // Create subject
  const subject = await prisma.subject.create({
    data: {
      name,
      code,
      defaultTotalMarks,
      defaultPassingMarks,
      category,
      level,
      description,
      institutionId,
    },
  });

  return subject;
};

/**
 * Get all subjects
 */

const getAllSubjectsFromDB = async (requestingUser) => {
  const where = {};

  if (!requestingUser.roles.includes("SUPER_ADMIN")) {
    where.institutionId = requestingUser.institutionId;
  }

  const subjects = await prisma.subject.findMany({
    where,
    include: {
      _count: {
        select: {
          classSubjects: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return subjects;
};

/**
 * Get single subject
 */

const getSingleSubjectFromDB = async (id, requestingUser) => {
  const subject = await prisma.subject.findUnique({
    where: { id },
    include: {
      classSubjects: {
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
      _count: {
        select: {
          classSubjects: true,
        },
      },
    },
  });

  if (!subject) {
    throw new AppError(httpStatus.NOT_FOUND, "Subject not found");
  }

  // Permission check
  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    subject.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only view subjects in your own institution",
    );
  }

  return subject;
};

// ========================================
// EXAM OPERATIONS
// ========================================

/**
 * Create Exam (✅ Updated to use classSubjectId)
 */

const createExamIntoDB = async (payload, requestingUser) => {
  const {
    name,
    type,
    academicYear,
    sectionIds,  // ← now an array
    startDate,
    endDate,
    classSubjects,
  } = payload;

  // Validate dates first (cheap check before DB calls)
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Start date cannot be after end date",
    );
  }

  //  Fetch all sections at once
  const sections = await prisma.section.findMany({
    where: { id: { in: sectionIds } },
    select: {
      id: true,
      name: true,
      institutionId: true,
      classId: true,
      class: { select: { id: true, name: true } },
    },
  });

  // Check all requested sections were found
  if (sections.length !== sectionIds.length) {
    const foundIds = sections.map((s) => s.id);
    const missingIds = sectionIds.filter((id) => !foundIds.includes(id));
    throw new AppError(
      httpStatus.NOT_FOUND,
      `Section(s) not found: ${missingIds.join(", ")}`,
    );
  }

  // Permission check — all sections must belong to requesting user's institution
  if (!requestingUser.roles.includes("SUPER_ADMIN")) {
    const unauthorized = sections.filter(
      (s) => s.institutionId !== requestingUser.institutionId,
    );
    if (unauthorized.length > 0) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You can only create exams for sections in your own institution",
      );
    }
  }

  // All sections must belong to the same class
  // (same classSubjects must apply to all of them)
  const uniqueClassIds = [...new Set(sections.map((s) => s.classId))];
  if (uniqueClassIds.length > 1) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "All sections must belong to the same class",
    );
  }

  const classId = uniqueClassIds[0];

  // Verify classSubjects exist and belong to this class
  const classSubjectIds = classSubjects.map((cs) => cs.classSubjectId);

  const existingClassSubjects = await prisma.academicClassSubject.findMany({
    where: {
      id: { in: classSubjectIds },
      classId,
    },
    include: {
      subject: {
        select: { id: true, name: true, code: true },
      },
    },
  });

  if (existingClassSubjects.length !== classSubjectIds.length) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "One or more class-subjects not found or do not belong to this class",
    );
  }

  // Validate marks overrides
  for (const cs of classSubjects) {
    const classSubject = existingClassSubjects.find(
      (ecs) => ecs.id === cs.classSubjectId,
    );

    const totalMarks = cs.totalMarks || classSubject.totalMarks;
    const passingMarks = cs.passingMarks || classSubject.passingMarks;

    if (passingMarks > totalMarks) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Passing marks cannot exceed total marks for subject "${classSubject.subject.name}"`,
      );
    }
  }

  //  Create one Exam per section, each with the full set of ExamSubjects
  const createdExams = await prisma.$transaction(async (tx) => {
    const results = [];

    for (const section of sections) {
      // Create the exam for this section
      const exam = await tx.exam.create({
        data: {
          name,
          type,
          academicYear,
          sectionId: section.id,
          startDate: start,
          endDate: end,
          institutionId: section.institutionId,
        },
      });

      // Create examSubjects for this exam — same classSubjects for every section
      const examSubjectsData = classSubjects.map((cs) => ({
        examId: exam.id,
        classSubjectId: cs.classSubjectId,
        totalMarks: cs.totalMarks || null,
        passingMarks: cs.passingMarks || null,
        examDate: cs.examDate ? new Date(cs.examDate) : null,
      }));

      await tx.examSubject.createMany({ data: examSubjectsData });

      results.push(exam);
    }

    return results;
  });

  // Fetch all created exams with full details
  const completeExams = await prisma.exam.findMany({
    where: { id: { in: createdExams.map((e) => e.id) } },
    include: {
      section: {
        select: {
          id: true,
          name: true,
          enrollments: {
            where: { status: "ACTIVE" },
            select: { studentId: true },
          },
          class: { select: { id: true, name: true } },
        },
      },
      examSubjects: {
        include: {
          classSubject: {
            include: {
              subject: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  category: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Transform response
  return completeExams.map((exam) => ({
    ...exam,
    examSubjects: exam.examSubjects.map((es) => ({
      id: es.id,
      examId: es.examId,
      classSubjectId: es.classSubjectId,
      subject: es.classSubject.subject,
      totalMarks: es.totalMarks ?? es.classSubject.totalMarks,
      passingMarks: es.passingMarks ?? es.classSubject.passingMarks,
      examDate: es.examDate,
    })),
  }));
};


/**
 * Delete Exam 
 */
const deleteSingleExamFromDB = async (examId) => {



  const isExamExist = await prisma.exam.findUnique({
    where: {id: examId},
    include: {
      examSubjects : true,
    },
  });

  console.log("EXAM", isExamExist);

  if(!isExamExist) {
    throw new AppError(httpStatus.NOT_FOUND, "Exam record not found.");
  }

// We must delete the 'children' (ExamSubject) before the 'parent' (Exam)
  const result = await prisma.$transaction(async (tx) =>{

    await tx.examSubject.deleteMany({
      where: { examId: examId },
    });

    const deletedExam = await tx.exam.delete({
      where : {id: examId },
    });

    return deletedExam;
  });

  return result;

}

/**
 * Update Exam
 */
const updateExam = async (id, payload) => {
  const { examSubjects, ...examData } = payload;

  // Convert string dates to JS Date objects for Prisma
  if (examData.startDate) {
    examData.startDate = new Date(examData.startDate);
  }
  if (examData.endDate) {
    examData.endDate = new Date(examData.endDate);
  }

  if(examData.startDate > examData.endDate){
    {
      throw new AppError(
        httpStatus.NOT_ACCEPTABLE,
        "Start date must be less than the End date",
      );
    }
  }

  // 1. Check if Exam exists
  const isExist = await prisma.exam.findUnique({
    where: { id },
  });

  if (!isExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'Exam not found!');
  }

  // 2. Use a Transaction to ensure data integrity
  const result = await prisma.$transaction(async (transactionClient) => {
    // Update basic Exam info (name, type, dates, etc.)
    const updatedExam = await transactionClient.exam.update({
      where: { id },
      data: examData,
    });

    // 3. Optional: Handle ExamSubjects nested updates
    // If you pass an array of subjects, this logic can sync them
    if (examSubjects && examSubjects.length > 0) {
      for (const subject of examSubjects) {
        await transactionClient.examSubject.upsert({
          where: {
            // Checks if this specific subject already exists in this exam
            examId_classSubjectId: {
              examId: id,
              classSubjectId: subject.classSubjectId,
            },
          },
          update: {
            totalMarks: subject.totalMarks,
            passingMarks: subject.passingMarks,
            examDate: subject.examDate ? new Date(subject.examDate) : undefined,
          },
          create: {
            ...subject,
            examId: id,
            examDate: subject.examDate ? new Date(subject.examDate) : undefined,
          },
        });
      }
    }

    return updatedExam;
  });

  // Return the updated exam with its subjects for the frontend
  return await prisma.exam.findUnique({
    where: { id: result.id },
    include: {
      examSubjects: true,
      section: true,
    },
  });
};

/**
 * Get all exams
 */
const getAllExamsFromDB = async (query, requestingUser) => {
  const { sectionId, academicYear } = query;

  const where = {};

  if (!requestingUser.roles.includes("SUPER_ADMIN")) {
    where.institutionId = requestingUser.institutionId;
  }

  if (sectionId) {
    where.sectionId = sectionId;
  }

  if (academicYear) {
    where.academicYear = parseInt(academicYear);
  }

  const exams = await prisma.exam.findMany({
    where,
    include: {
      section: {
        select: {
          id: true,
          name: true,
          class: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      examSubjects: {
        include: {
          //id: true,
          //classSubjectId : true, 
          classSubject: {
            include: { 
              //id: true, 
              subject: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  category: true,
                },
              },
            },
          },
        },
      },
      _count: {
        select: {
          examSubjects: true,
        },
      },
    },
    orderBy: {
      startDate: "desc",
    },
  });

  // Transform response
  const transformedExams = exams.map((exam) => ({
    ...exam,
    examSubjects: exam.examSubjects.map((es) => ({
      id: es.id,
      classSubjectId: es.classSubject.id,
      //classSubject: es.classSubject,
      subject: es.classSubject.subject,
      totalMarks: es.totalMarks || es.classSubject.totalMarks,
      passingMarks: es.passingMarks || es.classSubject.passingMarks,
      examDate: es.examDate,
    })),
  }));

  return transformedExams;
};

/**
 * Get single exam
 */

const getSingleExamFromDB = async (id, requestingUser) => {
  const exam = await prisma.exam.findUnique({
    where: { id },
    include: {
      section: {
        select: {
          id: true,
          name: true,
          class: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      examSubjects: {
        include: {
          classSubject: {
            include: {
              subject: true,
            },
          },
          _count: {
            select: {
              results: true,
            },
          },
        },
      },
    },
  });

  if (!exam) {
    throw new AppError(httpStatus.NOT_FOUND, "Exam not found");
  }

  // Permission check
  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    exam.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only view exams in your own institution",
    );
  }

  // Transform response
  const transformedExam = {
    ...exam,
    examSubjects: exam.examSubjects.map((es) => ({
      id: es.id,
      subject: es.classSubject.subject,
      totalMarks: es.totalMarks || es.classSubject.totalMarks,
      passingMarks: es.passingMarks || es.classSubject.passingMarks,
      examDate: es.examDate,
      resultsEntered: es._count.results,
    })),
  };

  return transformedExam;
};

// ========================================
// RESULT OPERATIONS
// ========================================

/**
 * Enter single result
 */

const enterResultIntoDB = async (payload, requestingUser) => {
  const { studentId, examSubjectId, marksObtained, remarks } = payload;

  // Get exam subject with all necessary data
  const examSubject = await prisma.examSubject.findUnique({
    where: { id: examSubjectId },
    include: {
      exam: {
        select: {
          id: true,
          name: true,
          sectionId: true,
          institutionId: true,
        },
      },
      classSubject: {
        select: {
          totalMarks: true,
          passingMarks: true,
          subject: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      },
    },
  });

  if (!examSubject) {
    throw new AppError(httpStatus.NOT_FOUND, "Exam subject not found");
  }

  // Permission check
  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    examSubject.exam.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only enter results for exams in your own institution",
    );
  }

  // Check student exists and is enrolled
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      enrollments: {
        where: {
          sectionId: examSubject.exam.sectionId,
          status: "ACTIVE",
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
      "Student is not enrolled in this section",
    );
  }

  // Get total marks
  const totalMarks =
    examSubject.totalMarks || examSubject.classSubject.totalMarks;
  const passingMarks =
    examSubject.passingMarks || examSubject.classSubject.passingMarks;

  // Validate marks
  const marksValidation = validateMarks(
    marksObtained,
    totalMarks,
    passingMarks,
  );

  if (!marksValidation.valid) {
    throw new AppError(httpStatus.BAD_REQUEST, marksValidation.message);
  }

  // Calculate grade
  const { grade, gpa } = calculateGrade(marksObtained, totalMarks);

  // Check if result already exists
  const existingResult = await prisma.result.findUnique({
    where: {
      studentId_examSubjectId: {
        studentId,
        examSubjectId,
      },
    },
  });

  if (existingResult) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Result already exists for this student and subject. Use update endpoint to modify.",
    );
  }

  // Create result
  const result = await prisma.result.create({
    data: {
      studentId,
      examSubjectId,
      marksObtained,
      grade,
      gpa,
      remarks,
      enteredById: requestingUser.userId,
      institutionId: examSubject.exam.institutionId,
    },
    include: {
      student: {
        select: {
          id: true,
          studentCode: true,
          fullNameEnglish: true,
        },
      },
      examSubject: {
        include: {
          classSubject: {
            include: {
              subject: true,
            },
          },
          exam: {
            select: {
              name: true,
              type: true,
            },
          },
        },
      },
    },
  });

  // Transform response
  return {
    id: result.id,
    student: result.student,
    subject: result.examSubject.classSubject.subject,
    exam: result.examSubject.exam,
    marksObtained: result.marksObtained,
    totalMarks,
    passingMarks,
    grade: result.grade,
    gpa: result.gpa,
    percentage: calculatePercentage(result.marksObtained, totalMarks),
    remarks: result.remarks,
    createdAt: result.createdAt,
  };
};

/**
 * Bulk result entry
 */

const bulkResultEntryIntoDB = async (payload, requestingUser) => {
  const { examSubjectId, results } = payload;
console.log(requestingUser);
  // Get exam subject
  const examSubject = await prisma.examSubject.findUnique({
    where: { id: examSubjectId },
    include: {
      exam: {
        select: {
          id: true,
          name: true,
          sectionId: true,
          institutionId: true,
        },
      },
      classSubject: {
        select: {
          totalMarks: true,
          passingMarks: true,
          subject: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!examSubject) {
    throw new AppError(httpStatus.NOT_FOUND, "Exam subject not found");
  }

  // Permission check
  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    examSubject.exam.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only enter results for exams in your own institution",
    );
  }

  const totalMarks =
    examSubject.totalMarks || examSubject.classSubject.totalMarks;
  const passingMarks =
    examSubject.passingMarks || examSubject.classSubject.passingMarks;

  // Verify all students
  const studentIds = results.map((r) => r.studentId);
  const students = await prisma.student.findMany({
    where: {
      id: { in: studentIds },
    },
    include: {
      enrollments: {
        where: {
          sectionId: examSubject.exam.sectionId,
          status: "ACTIVE",
        },
      },
    },
  });

  if (students.length !== studentIds.length) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "One or more students not found",
    );
  }

  // Check all students are enrolled
  const notEnrolled = students.filter((s) => s.enrollments.length === 0);
  if (notEnrolled.length > 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Students not enrolled in section: ${notEnrolled.map((s) => s.studentCode).join(", ")}`,
    );
  }

  // Validate all marks
  for (const result of results) {
    const validation = validateMarks(
      result.marksObtained,
      totalMarks,
      passingMarks,
    );
    if (!validation.valid) {
      throw new AppError(httpStatus.BAD_REQUEST, validation.message);
    }
  }

  // Prepare result data
  const resultData = results.map((r) => {
    const { grade, gpa } = calculateGrade(r.marksObtained, totalMarks);

    return {
      studentId: r.studentId,
      examSubjectId,
      marksObtained: r.marksObtained,
      grade,
      gpa,
      remarks: r.remarks,
      enteredById: requestingUser.userId,
      institutionId: examSubject.exam.institutionId,
    };
  });

  // Bulk insert in transaction
  const createdResults = await prisma.$transaction(async (tx) => {
    const created = [];

    for (const data of resultData) {
      const result = await tx.result.upsert({
        where: {
          studentId_examSubjectId: {
            studentId: data.studentId,
            examSubjectId: data.examSubjectId,
          },
        },
        update: {
          marksObtained: data.marksObtained,
          grade: data.grade,
          gpa: data.gpa,
          remarks: data.remarks,
        },
        create: data,
      });

      created.push(result);
    }

    return created;
  });

  return {
    examSubject: {
      subject: examSubject.classSubject.subject.name,
      exam: examSubject.exam.name,
      totalMarks,
      passingMarks,
    },
    resultsEntered: createdResults.length,
    results: createdResults.map((r) => ({
      studentId: r.studentId,
      marksObtained: r.marksObtained,
      grade: r.grade,
      gpa: r.gpa,
    })),
  };
};

/**
 * Get student report card
 */

const getStudentReportCard = async (studentId, examId, requestingUser) => {
  // Check exam exists
  //console.log("requestingUser service: ", requestingUser);
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: {
      id: true,
      name: true,
      type: true,
      institutionId: true,
      sectionId: true,
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
  });

  if (!exam) {
    throw new AppError(httpStatus.NOT_FOUND, "Exam not found");
  }

  // Permission check
  console.log("Working");
  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    exam.institutionId !== requestingUser.institutionId
  ) {
    //console.log("Working");
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only view results in your own institution",
    );
  }
  console.log("Workinggg");
  // Check student
  
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      studentCode: true,
      fullNameEnglish: true,
      enrollments: {
        where: {
          sectionId: exam.sectionId,
          status: "ACTIVE",
        },
        select: {
          rollNumber: true,
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
      "Student is not enrolled in this section",
    );
  }

  // Get all results for this student in this exam
  
  const results = await prisma.result.findMany({
    where: {
      studentId,
      examSubject: {
        examId,
      },
    },
    include: {
      examSubject: {
        include: {
          classSubject: {
            include: {
              subject: true,
            },
          },
        },
      },
    },
    orderBy: {
      examSubject: {
        classSubject: {
          subject: {
            name: "asc",
          },
        },
      },
    },
  });
  
  // Transform results
  const subjectResults = results.map((r) => {
    const totalMarks =
      r.examSubject.totalMarks || r.examSubject.classSubject.totalMarks;
    const passingMarks =
      r.examSubject.passingMarks || r.examSubject.classSubject.passingMarks;

    return {
      subject: r.examSubject.classSubject.subject.name,
      subjectCode: r.examSubject.classSubject.subject.code,
      marksObtained: r.marksObtained,
      totalMarks,
      passingMarks,
      percentage: calculatePercentage(r.marksObtained, totalMarks),
      grade: r.grade,
      gpa: r.gpa,
      remarks: r.remarks,
    };
  });

  // Calculate overall result
  const overallResult = calculateOverallResult(
    subjectResults.map((sr) => ({
      grade: sr.grade,
      gpa: sr.gpa,
      subjectName: sr.subject,
    })),
  );

  return {
    student: {
      id: student.id,
      studentCode: student.studentCode,
      fullName: student.fullNameEnglish,
      rollNumber: student.enrollments[0]?.rollNumber,
    },
    exam: {
      id: exam.id,
      name: exam.name,
      type: exam.type,
      class: exam.section.class.name,
      section: exam.section.name,
    },
    subjectResults,
    overallResult,
  };
};

/**
 * Get section summary
 */

const getSectionSummary = async (sectionId, examId, requestingUser) => {
  // Check exam exists
  const exam = await prisma.exam.findUnique({
    where: { id: examId, sectionId },
    select: {
      id: true,
      name: true,
      type: true,
      institutionId: true,
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
  });

  if (!exam) {
    throw new AppError(httpStatus.NOT_FOUND, "Exam not found for this section");
  }

  // Permission check
  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    exam.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only view results in your own institution",
    );
  }

  // Get all enrolled students
  const enrolledStudents = await prisma.studentEnrollment.findMany({
    where: {
      sectionId,
      status: "ACTIVE",
    },
    select: {
      studentId: true,
      rollNumber: true,
      student: {
        select: {
          id: true,
          studentCode: true,
          fullNameEnglish: true,
        },
      },
    },
    orderBy: {
      rollNumber: "asc",
    },
  });

  // Get all exam subjects
  const examSubjects = await prisma.examSubject.findMany({
    where: { examId },
    include: {
      classSubject: {
        include: {
          subject: true,
        },
      },
    },
  });

  // Get all results
  const allResults = await prisma.result.findMany({
    where: {
      examSubject: {
        examId,
      },
    },
    include: {
      examSubject: {
        include: {
          classSubject: {
            include: {
              subject: true,
            },
          },
        },
      },
    },
  });

  // Calculate student-wise results
  const studentResults = enrolledStudents.map((enrollment) => {
    const studentSubjectResults = allResults.filter(
      (r) => r.studentId === enrollment.studentId,
    );

    const subjectResults = studentSubjectResults.map((r) => {
      const totalMarks =
        r.examSubject.totalMarks || r.examSubject.classSubject.totalMarks;

      return {
        subject: r.examSubject.classSubject.subject.name,
        marksObtained: r.marksObtained,
        totalMarks,
        grade: r.grade,
        gpa: r.gpa,
        subjectName: r.examSubject.classSubject.subject.name,
      };
    });

    const overallResult =
      subjectResults.length > 0
        ? calculateOverallResult(subjectResults)
        : {
            totalGPA: 0,
            averageGPA: 0,
            overallGrade: "N/A",
            status: "PENDING",
            failedSubjects: [],
          };

    // Calculate total obtained and total marks
    const totalObtained = subjectResults.reduce(
      (sum, r) => sum + r.marksObtained,
      0,
    );
    const grandTotal = subjectResults.reduce((sum, r) => sum + r.totalMarks, 0);

    return {
      student: enrollment.student,
      rollNumber: enrollment.rollNumber,
      totalObtained,
      grandTotal,
      percentage: calculatePercentage(totalObtained, grandTotal),
      averageGPA: overallResult.averageGPA,
      overallGrade: overallResult.overallGrade,
      status: overallResult.status,
      subjectResults,
    };
  });

  // Sort by percentage (ranking)
  studentResults.sort((a, b) => b.percentage - a.percentage);

  // Add rank
  studentResults.forEach((result, index) => {
    result.rank = index + 1;
  });

  // Calculate statistics
  const passedStudents = studentResults.filter((r) => r.status === "PASS");
  const failedStudents = studentResults.filter((r) => r.status === "FAIL");

  return {
    exam: {
      name: exam.name,
      type: exam.type,
      class: exam.section.class.name,
      section: exam.section.name,
    },
    statistics: {
      totalStudents: enrolledStudents.length,
      resultsEntered: studentResults.filter((r) => r.status !== "PENDING")
        .length,
      passedStudents: passedStudents.length,
      failedStudents: failedStudents.length,
      passPercentage:
        enrolledStudents.length > 0
          ? parseFloat(
              ((passedStudents.length / enrolledStudents.length) * 100).toFixed(
                2,
              ),
            )
          : 0,
    },
    studentResults,
  };
};

/**
 * Subject-wise analysis
 */

const getSubjectAnalysis = async (examId, examSubjectId, requestingUser) => {
  // Get exam subject
  const examSubject = await prisma.examSubject.findUnique({
    where: { id: examSubjectId, examId },
    include: {
      exam: {
        select: {
          id: true,
          name: true,
          institutionId: true,
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
      classSubject: {
        include: {
          subject: true,
        },
      },
    },
  });

  if (!examSubject) {
    throw new AppError(httpStatus.NOT_FOUND, "Exam subject not found");
  }

  // Permission check
  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    examSubject.exam.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only view results in your own institution",
    );
  }

  // Get all results for this subject
  const results = await prisma.result.findMany({
    where: {
      examSubjectId,
    },
    include: {
      student: {
        select: {
          studentCode: true,
          fullNameEnglish: true,
        },
      },
    },
    orderBy: {
      marksObtained: "desc",
    },
  });

  const totalMarks =
    examSubject.totalMarks || examSubject.classSubject.totalMarks;
  const passingMarks =
    examSubject.passingMarks || examSubject.classSubject.passingMarks;

  // Calculate statistics
  const statistics = formatResultStatistics(results);

  // Grade distribution
  const gradeDistribution = {};
  results.forEach((r) => {
    gradeDistribution[r.grade] = (gradeDistribution[r.grade] || 0) + 1;
  });

  return {
    exam: {
      name: examSubject.exam.name,
      class: examSubject.exam.section.class.name,
      section: examSubject.exam.section.name,
    },
    subject: {
      name: examSubject.classSubject.subject.name,
      code: examSubject.classSubject.subject.code,
      totalMarks,
      passingMarks,
    },
    statistics,
    gradeDistribution,
    topPerformers: results.slice(0, 5).map((r, index) => ({
      rank: index + 1,
      studentCode: r.student.studentCode,
      studentName: r.student.fullNameEnglish,
      marksObtained: r.marksObtained,
      percentage: calculatePercentage(r.marksObtained, totalMarks),
      grade: r.grade,
      gpa: r.gpa,
    })),
  };
};

/**
 * Update result
 */

const updateResultIntoDB = async (id, payload, requestingUser) => {
  const { marksObtained, remarks } = payload;

  // Get existing result
  const existingResult = await prisma.result.findUnique({
    where: { id },
    include: {
      examSubject: {
        include: {
          exam: {
            select: {
              institutionId: true,
            },
          },
          classSubject: {
            select: {
              totalMarks: true,
              passingMarks: true,
            },
          },
        },
      },
    },
  });

  if (!existingResult) {
    throw new AppError(httpStatus.NOT_FOUND, "Result not found");
  }

  // Permission check
  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    existingResult.examSubject.exam.institutionId !==
      requestingUser.institutionId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only update results in your own institution",
    );
  }

  const totalMarks =
    existingResult.examSubject.totalMarks ||
    existingResult.examSubject.classSubject.totalMarks;
  const passingMarks =
    existingResult.examSubject.passingMarks ||
    existingResult.examSubject.classSubject.passingMarks;

  // If marks are being updated, recalculate grade
  let updateData = { remarks };

  if (marksObtained !== undefined) {
    const validation = validateMarks(marksObtained, totalMarks, passingMarks);
    if (!validation.valid) {
      throw new AppError(httpStatus.BAD_REQUEST, validation.message);
    }

    const { grade, gpa } = calculateGrade(marksObtained, totalMarks);

    updateData = {
      ...updateData,
      marksObtained,
      grade,
      gpa,
    };
  }

  // Update result
  const updatedResult = await prisma.result.update({
    where: { id },
    data: updateData,
    include: {
      student: {
        select: {
          studentCode: true,
          fullNameEnglish: true,
        },
      },
      examSubject: {
        include: {
          classSubject: {
            include: {
              subject: true,
            },
          },
          exam: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  return {
    id: updatedResult.id,
    student: updatedResult.student,
    subject: updatedResult.examSubject.classSubject.subject,
    exam: updatedResult.examSubject.exam,
    marksObtained: updatedResult.marksObtained,
    totalMarks,
    passingMarks,
    percentage: calculatePercentage(updatedResult.marksObtained, totalMarks),
    grade: updatedResult.grade,
    gpa: updatedResult.gpa,
    remarks: updatedResult.remarks,
    updatedAt: updatedResult.updatedAt,
  };
};

/**
 * Get all results (with filters)
 */
const getAllResultsFromDB = async (query, requestingUser) => {
  const { examId, studentId, examSubjectId, sectionId } = query;
 //console.log(examId, studentId, examSubjectId, sectionId )

  const where = {};

  // Institution filter
  if (!requestingUser.roles.includes("SUPER_ADMIN")) {
    where.institutionId = requestingUser.institutionId;
  }

  // Exam filter
  if (examId) {
    where.examSubject = {
      examId,
    };
  }

  // Student filter
  if (studentId) {
    where.studentId = studentId;
  }

  // Exam Subject filter
  if (examSubjectId) {
    where.examSubjectId = examSubjectId;
  }

  // Section filter
  if (sectionId) {
    where.examSubject = {
      exam: {
        sectionId,
      },
    };
  }
  console.log(requestingUser.roles, requestingUser.userId);

 let results;
  if(requestingUser.roles == "STUDENT"){
    results = await prisma.result.findMany({
      where: {
        ...where,
        student: {
          userId: requestingUser.userId, 
        },
      },
      include: {
        student: {
          select: {
            id: true,
            studentCode: true,
            fullNameEnglish: true,
          },
        },
        examSubject: {
          include: {
            classSubject: {
              include: {
                subject: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                  },
                },
              },
            },
            exam: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
        enteredBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: [
        { examSubject: { exam: { startDate: "desc" } } },
        { student: { studentCode: "asc" } },
      ],
    });
  }

else{
 results = await prisma.result.findMany({
    where,
    include: {
      student: {
        select: {
          id: true,
          studentCode: true,
          fullNameEnglish: true,
        },
      },
      examSubject: {
        include: {
          classSubject: {
            include: {
              subject: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
            },
          },
          exam: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      },
      enteredBy: {
        select: {
          id: true,
          username: true,
        },
      },
    },
    orderBy: [
      { examSubject: { exam: { startDate: "desc" } } },
      { student: { studentCode: "asc" } },
    ],
  });
}

  // Transform response
  const transformedResults = results.map((r) => {
    const totalMarks =
      r.examSubject.totalMarks || r.examSubject.classSubject.totalMarks;
    const passingMarks =
      r.examSubject.passingMarks || r.examSubject.classSubject.passingMarks;

    return {
      id: r.id,
      student: r.student,
      subject: r.examSubject.classSubject.subject,
      exam: r.examSubject.exam,
      marksObtained: r.marksObtained,
      totalMarks,
      passingMarks,
      percentage: calculatePercentage(r.marksObtained, totalMarks),
      grade: r.grade,
      gpa: r.gpa,
      remarks: r.remarks,
      enteredBy: r.enteredBy,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  });

  return transformedResults;
};

/**
 * Get single result
 */

const getSingleResultFromDB = async (id, requestingUser) => {
  const result = await prisma.result.findUnique({
    where: { id },
    include: {
      student: {
        select: {
          id: true,
          studentCode: true,
          fullNameEnglish: true,
          fullNameBangla: true,
        },
      },
      examSubject: {
        include: {
          classSubject: {
            include: {
              subject: true,
            },
          },
          exam: {
            select: {
              id: true,
              name: true,
              type: true,
              academicYear: true,
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
      enteredBy: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Result not found");
  }

  // Permission check
  if (
    !requestingUser.roles.includes("SUPER_ADMIN") &&
    result.institutionId !== requestingUser.institutionId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only view results in your own institution",
    );
  }

  const totalMarks =
    result.examSubject.totalMarks || result.examSubject.classSubject.totalMarks;
  const passingMarks =
    result.examSubject.passingMarks ||
    result.examSubject.classSubject.passingMarks;

  return {
    id: result.id,
    student: result.student,
    subject: result.examSubject.classSubject.subject,
    exam: {
      ...result.examSubject.exam,
      class: result.examSubject.exam.section.class.name,
      section: result.examSubject.exam.section.name,
    },
    marksObtained: result.marksObtained,
    totalMarks,
    passingMarks,
    percentage: calculatePercentage(result.marksObtained, totalMarks),
    grade: result.grade,
    gpa: result.gpa,
    remarks: result.remarks,
    enteredBy: result.enteredBy,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
  };
};

export const resultServices = {
  // Subject
  createSubjectIntoDB,
  getAllSubjectsFromDB,
  getSingleSubjectFromDB,

  // Exam
  createExamIntoDB,
  getAllExamsFromDB,
  getSingleExamFromDB,
  deleteSingleExamFromDB,
  updateExam,
  
  // Result
  enterResultIntoDB,
  bulkResultEntryIntoDB,
  getStudentReportCard,
  getSectionSummary,
  getSubjectAnalysis,
  updateResultIntoDB,
  getAllResultsFromDB,
  getSingleResultFromDB,
};
