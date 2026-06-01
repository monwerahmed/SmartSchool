import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({
  adapter,
  log: ["query", "info", "warn", "error"],
});

async function main() {
  console.log("Starting database seeding...\n");

  // ========================================
  // 1. SEED ROLES
  // ========================================
  console.log("Seeding Roles...");

  const rolesData = [
    {
      name: "SUPER_ADMIN",
      description: "System owner with full access to all resources",
      permissions: [
        { resource: "INSTITUTION", actions: ["MANAGE"] },
        { resource: "USER", actions: ["MANAGE"] },
        { resource: "STUDENT", actions: ["MANAGE"] },
        { resource: "TEACHER", actions: ["MANAGE"] },
        { resource: "GUARDIAN", actions: ["MANAGE"] },
        { resource: "ATTENDANCE", actions: ["MANAGE"] },
        { resource: "RESULT", actions: ["MANAGE"] },
        { resource: "EXAM", actions: ["MANAGE"] },
        { resource: "SUBJECT", actions: ["MANAGE"] },
        { resource: "LIBRARY", actions: ["MANAGE"] },
        { resource: "ACCOUNT", actions: ["MANAGE"] },
        { resource: "REPORT", actions: ["MANAGE"] },
        { resource: "ACADEMIC_CLASS", actions: ["MANAGE"] },
        { resource: "SECTION", actions: ["MANAGE"] },
        { resource: "ENROLLMENT", actions: ["MANAGE"] },
        { resource: "LIBRARIAN", actions: ["MANAGE"]},
      ],
    },
    {
      name: "ADMIN",
      description: "Institutional Administrator",
      permissions: [
        { resource: "INSTITUTION", actions: ["VIEW", "UPDATE"] },
        { resource: "USER", actions: ["CREATE", "VIEW", "UPDATE", "DELETE"] },
        { resource: "STUDENT", actions: ["MANAGE"] },
        { resource: "TEACHER", actions: ["MANAGE"] },
        { resource: "GUARDIAN", actions: ["MANAGE"] },
        { resource: "ATTENDANCE", actions: ["MANAGE"] },
        { resource: "RESULT", actions: ["MANAGE"] },
        { resource: "EXAM", actions: ["MANAGE"] },
        { resource: "SUBJECT", actions: ["MANAGE"] },
        { resource: "REPORT", actions: ["VIEW"] },
        { resource: "ACADEMIC_CLASS", actions: ["MANAGE"] },
        { resource: "SECTION", actions: ["MANAGE"] },
        { resource: "ENROLLMENT", actions: ["MANAGE"] },
        { resource: "LIBRARY", actions: ["MANAGE"]},
        { resource: "LIBRARIAN", actions: ["MANAGE"]},
      ],
    },
    {
      name: "PRINCIPAL",
      description: "Head of the institution",
      permissions: [
        { resource: "INSTITUTION", actions: ["VIEW", "UPDATE"] },
        {
          resource: "TEACHER",
          actions: ["CREATE", "VIEW", "UPDATE", "DELETE"],
        },
        { resource: "STUDENT", actions: ["VIEW", "UPDATE"] },
        { resource: "GUARDIAN", actions: ["VIEW"] },
        { resource: "ATTENDANCE", actions: ["MANAGE"] },
        { resource: "RESULT", actions: ["MANAGE"] },
        { resource: "EXAM", actions: ["CREATE", "VIEW", "UPDATE"] },
        { resource: "SUBJECT", actions: ["VIEW", "CREATE", "UPDATE"] },
        { resource: "REPORT", actions: ["VIEW"] },
        { resource: "ACADEMIC_CLASS", actions: ["VIEW"] },
        { resource: "SECTION", actions: ["MANAGE"] },
        { resource: "ENROLLMENT", actions: ["VIEW"] },
        { resource: "LIBRARY", actions: ["MANAGE"]},
      ],
    },
    {
      name: "VICE_PRINCIPAL",
      description: "Assistant to Principal",
      permissions: [
        { resource: "TEACHER", actions: ["VIEW"] },
        { resource: "STUDENT", actions: ["VIEW", "UPDATE"] },
        { resource: "GUARDIAN", actions: ["VIEW"] },
        { resource: "ATTENDANCE", actions: ["VIEW"] },
        { resource: "RESULT", actions: ["VIEW"] },
        { resource: "EXAM", actions: ["VIEW"] },
        { resource: "SUBJECT", actions: ["VIEW"] },
        { resource: "REPORT", actions: ["VIEW"] },
        { resource: "ACADEMIC_CLASS", actions: ["VIEW"] },
        { resource: "SECTION", actions: ["VIEW"] },
        { resource: "ENROLLMENT", actions: ["VIEW"] },
      ],
    },
    {
      name: "TEACHER",
      description: "Faculty member with classroom access",
      permissions: [
        { resource: "STUDENT", actions: ["VIEW"] },
        { resource: "ATTENDANCE", actions: ["CREATE", "VIEW", "UPDATE"] },
        { resource: "RESULT", actions: ["CREATE", "VIEW", "UPDATE"] },
        { resource: "EXAM", actions: ["VIEW"] },
        { resource: "SUBJECT", actions: ["VIEW"] },
        { resource: "ACADEMIC_CLASS", actions: ["VIEW"] },
        { resource: "SECTION", actions: ["VIEW"] },
        { resource: "ENROLLMENT", actions: ["VIEW"] },
      ],
    },
    {
      name: "STUDENT",
      description: "Student account with limited access",
      permissions: [
        { resource: "RESULT", actions: ["VIEW"] },
        { resource: "ATTENDANCE", actions: ["VIEW"] },
        { resource: "LIBRARY", actions: ["VIEW"] },
        { resource: "ENROLLMENT", actions: ["VIEW"] },
      ],
    },
    {
      name: "GUARDIAN",
      description: "Guardian/Parent account",
      permissions: [
        { resource: "STUDENT", actions: ["VIEW"] },
        { resource: "RESULT", actions: ["VIEW"] },
        { resource: "ATTENDANCE", actions: ["VIEW"] },
        { resource: "REPORT", actions: ["VIEW"] },
        { resource: "ENROLLMENT", actions: ["VIEW"] },
      ],
    },
    {
      name: "ACCOUNTANT",
      description: "Financial officer",
      permissions: [
        { resource: "ACCOUNT", actions: ["CREATE", "VIEW", "UPDATE"] },
        { resource: "STUDENT", actions: ["VIEW"] },
        { resource: "REPORT", actions: ["VIEW"] },
      ],
    },
    {
      name: "LIBRARIAN",
      description: "Library management",
      permissions: [
        {
          resource: "LIBRARY",
          actions: ["CREATE", "VIEW", "UPDATE", "DELETE"],
        },
        { resource: "STUDENT", actions: ["VIEW"] },
        { resource: "TEACHER", actions: ["VIEW"] },
        { resource: "LIBRARIAN", actions: ["VIEW"]},
      ],
    },
  ];

  for (const roleData of rolesData) {
    const role = await prisma.role.upsert({
      where: { name: roleData.name },
      update: { description: roleData.description },
      create: {
        name: roleData.name,
        description: roleData.description,
      },
    });

    for (const perm of roleData.permissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_resource: {
            roleId: role.id,
            resource: perm.resource,
          },
        },
        update: { actions: perm.actions },
        create: {
          roleId: role.id,
          resource: perm.resource,
          actions: perm.actions,
        },
      });
    }

    console.log(
      `    ${roleData.name} - ${roleData.permissions.length} permissions`,
    );
  }

  console.log("\n All roles and permissions seeded successfully!\n");

  // ========================================
  // 2. SEED DEMO INSTITUTION
  // ========================================
  console.log(" Seeding Demo Institution...");

  const existingInstitution = await prisma.institution.findFirst({
    where: {
      OR: [{ code: "DEMO001" }, { eiin: "123456" }],
    },
  });

  let demoInstitution;

  if (!existingInstitution) {
    demoInstitution = await prisma.institution.create({
      data: {
        name: "Demo High School",
        code: "DEMO001",
        eiin: "123456",
        type: "High School",
        email: "demo@school.com",
        phone: "01711111111",
        address: "Dhaka, Bangladesh",
        status: "ACTIVE",
      },
    });
    console.log(`  Institution created: ${demoInstitution.name}\n`);
  } else {
    demoInstitution = existingInstitution;
    console.log(
      `Institution already exists: ${existingInstitution.name}\n`,
    );
  }

  // ========================================
  // 3. SEED DEMO SUBJECTS (Master List)
  // ========================================
  console.log(" Seeding Demo Subjects...");

  const subjects = [
    // ভাষা বিষয়সমূহ
    {
      name: "বাংলা",
      code: "BAN",
      category: "LANGUAGES",
      level: "SECONDARY",
      defaultTotalMarks: 100,
      defaultPassingMarks: 33,
      description: "বাংলা ভাষা ও সাহিত্য",
    },
    {
      name: "English",
      code: "ENG",
      category: "LANGUAGES",
      level: "SECONDARY",
      defaultTotalMarks: 100,
      defaultPassingMarks: 33,
      description: "English Language",
    },

    // গণিত
    {
      name: "গণিত",
      code: "MATH",
      category: "MATHEMATICS",
      level: "SECONDARY",
      defaultTotalMarks: 100,
      defaultPassingMarks: 33,
      description: "সাধারণ গণিত",
    },
    {
      name: "উচ্চতর গণিত",
      code: "HMATH",
      category: "MATHEMATICS",
      level: "SECONDARY",
      defaultTotalMarks: 100,
      defaultPassingMarks: 33,
      description: "Higher Mathematics",
    },

    // বিজ্ঞান
    {
      name: "সাধারণ বিজ্ঞান",
      code: "SCI",
      category: "SCIENCE",
      level: "JUNIOR",
      defaultTotalMarks: 100,
      defaultPassingMarks: 33,
      description: "প্রাথমিক ও নিম্ন মাধ্যমিকের বিজ্ঞান",
    },
    {
      name: "পদার্থবিজ্ঞান",
      code: "PHY",
      category: "SCIENCE",
      level: "SECONDARY",
      defaultTotalMarks: 100,
      defaultPassingMarks: 33,
      description: "Physics",
    },
    {
      name: "রসায়ন",
      code: "CHEM",
      category: "SCIENCE",
      level: "SECONDARY",
      defaultTotalMarks: 100,
      defaultPassingMarks: 33,
      description: "Chemistry",
    },
    {
      name: "জীববিজ্ঞান",
      code: "BIO",
      category: "SCIENCE",
      level: "SECONDARY",
      defaultTotalMarks: 100,
      defaultPassingMarks: 33,
      description: "Biology",
    },

    // সমাজবিজ্ঞান
    {
      name: "বাংলাদেশ ও বিশ্বপরিচয়",
      code: "BGS",
      category: "SOCIAL",
      level: "JUNIOR",
      defaultTotalMarks: 100,
      defaultPassingMarks: 33,
      description: "Bangladesh and Global Studies",
    },
    {
      name: "ইতিহাস",
      code: "HIST",
      category: "SOCIAL",
      level: "SECONDARY",
      defaultTotalMarks: 100,
      defaultPassingMarks: 33,
      description: "History",
    },
    {
      name: "ভূগোল",
      code: "GEO",
      category: "SOCIAL",
      level: "SECONDARY",
      defaultTotalMarks: 100,
      defaultPassingMarks: 33,
      description: "Geography",
    },

    // ধর্মীয়
    {
      name: "ইসলাম শিক্ষা",
      code: "ISL",
      category: "RELIGIOUS",
      level: "SECONDARY",
      defaultTotalMarks: 100,
      defaultPassingMarks: 33,
      description: "Islamic Studies",
    },

    // কলা
    {
      name: "চারু ও কারুকলা",
      code: "ART",
      category: "ARTS",
      level: "PRIMARY",
      defaultTotalMarks: 50,
      defaultPassingMarks: 17,
      description: "Arts and Crafts",
    },

    // তথ্য ও যোগাযোগ প্রযুক্তি
    {
      name: "তথ্য ও যোগাযোগ প্রযুক্তি",
      code: "ICT",
      category: "GENERAL",
      level: "SECONDARY",
      defaultTotalMarks: 100,
      defaultPassingMarks: 33,
      description: "Information & Communication Technology",
    },
  ];

  let createdSubjectsCount = 0;

  for (const subjectData of subjects) {
    const existing = await prisma.subject.findFirst({
      where: {
        code: subjectData.code,
        institutionId: demoInstitution.id,
      },
    });

    if (!existing) {
      await prisma.subject.create({
        data: {
          ...subjectData,
          institutionId: demoInstitution.id,
        },
      });
      createdSubjectsCount++;
    }
  }

  console.log(`Created ${createdSubjectsCount} demo subjects\n`);

  // ========================================
  // 4. SEED CLASS-SUBJECT MAPPINGS (Example)
  // ========================================
  console.log(" Seeding Class-Subject Mappings (Example)...");

  // Get demo institution's classes and subjects
  const class1 = await prisma.academicClass.findFirst({
    where: {
      name: "Class 1",
      institutionId: demoInstitution.id,
    },
  });

  const class7 = await prisma.academicClass.findFirst({
    where: {
      name: "Class 7",
      institutionId: demoInstitution.id,
    },
  });

  const class9 = await prisma.academicClass.findFirst({
    where: {
      name: "Class 9",
      institutionId: demoInstitution.id,
    },
  });

  const allSubjects = await prisma.subject.findMany({
    where: { institutionId: demoInstitution.id },
  });

  const getSubjectByCode = (code) => allSubjects.find((s) => s.code === code);

  let mappingsCreated = 0;

  // Class 1 এর subjects (4টা)
  if (class1) {
    const class1Subjects = [
      {
        subjectId: getSubjectByCode("BAN")?.id,
        totalMarks: 100,
        passingMarks: 33,
        isCompulsory: true,
      },
      {
        subjectId: getSubjectByCode("ENG")?.id,
        totalMarks: 100,
        passingMarks: 33,
        isCompulsory: true,
      },
      {
        subjectId: getSubjectByCode("MATH")?.id,
        totalMarks: 100,
        passingMarks: 33,
        isCompulsory: true,
      },
      {
        subjectId: getSubjectByCode("ART")?.id,
        totalMarks: 50,
        passingMarks: 17,
        isCompulsory: true,
      },
    ];

    for (const cs of class1Subjects) {
      if (cs.subjectId) {
        const existing = await prisma.academicClassSubject.findFirst({
          where: {
            classId: class1.id,
            subjectId: cs.subjectId,
          },
        });

        if (!existing) {
          await prisma.academicClassSubject.create({
            data: {
              classId: class1.id,
              ...cs,
            },
          });
          mappingsCreated++;
        }
      }
    }
  }

  // Class 7 এর subjects (9টা)
  if (class7) {
    const class7Subjects = [
      {
        subjectId: getSubjectByCode("BAN")?.id,
        totalMarks: 100,
        passingMarks: 33,
        isCompulsory: true,
      },
      {
        subjectId: getSubjectByCode("ENG")?.id,
        totalMarks: 100,
        passingMarks: 33,
        isCompulsory: true,
      },
      {
        subjectId: getSubjectByCode("MATH")?.id,
        totalMarks: 100,
        passingMarks: 33,
        isCompulsory: true,
      },
      {
        subjectId: getSubjectByCode("SCI")?.id,
        totalMarks: 100,
        passingMarks: 33,
        isCompulsory: true,
      },
      {
        subjectId: getSubjectByCode("BGS")?.id,
        totalMarks: 100,
        passingMarks: 33,
        isCompulsory: true,
      },
      {
        subjectId: getSubjectByCode("ISL")?.id,
        totalMarks: 100,
        passingMarks: 33,
        isCompulsory: true,
      },
      {
        subjectId: getSubjectByCode("ICT")?.id,
        totalMarks: 100,
        passingMarks: 33,
        isCompulsory: true,
      },
      {
        subjectId: getSubjectByCode("ART")?.id,
        totalMarks: 50,
        passingMarks: 17,
        isCompulsory: false, // Optional
      },
      {
        subjectId: getSubjectByCode("HMATH")?.id,
        totalMarks: 100,
        passingMarks: 33,
        isCompulsory: false, // Optional
      },
    ];

    for (const cs of class7Subjects) {
      if (cs.subjectId) {
        const existing = await prisma.academicClassSubject.findFirst({
          where: {
            classId: class7.id,
            subjectId: cs.subjectId,
          },
        });

        if (!existing) {
          await prisma.academicClassSubject.create({
            data: {
              classId: class7.id,
              ...cs,
            },
          });
          mappingsCreated++;
        }
      }
    }
  }

  // Class 9 এর subjects
  if (class9) {
    const class9Subjects = [
      {
        subjectId: getSubjectByCode("BAN")?.id,
        totalMarks: 100,
        passingMarks: 33,
        isCompulsory: true,
      },
      {
        subjectId: getSubjectByCode("ENG")?.id,
        totalMarks: 100,
        passingMarks: 33,
        isCompulsory: true,
      },
      {
        subjectId: getSubjectByCode("MATH")?.id,
        totalMarks: 100,
        passingMarks: 33,
        isCompulsory: true,
      },
      {
        subjectId: getSubjectByCode("PHY")?.id,
        totalMarks: 100,
        passingMarks: 33,
        isCompulsory: true,
      },
      {
        subjectId: getSubjectByCode("CHEM")?.id,
        totalMarks: 100,
        passingMarks: 33,
        isCompulsory: true,
      },
      {
        subjectId: getSubjectByCode("BIO")?.id,
        totalMarks: 100,
        passingMarks: 33,
        isCompulsory: false, // Science group এ compulsory, arts এ না
      },
      {
        subjectId: getSubjectByCode("HMATH")?.id,
        totalMarks: 100,
        passingMarks: 33,
        isCompulsory: false, // Optional
      },
      {
        subjectId: getSubjectByCode("ICT")?.id,
        totalMarks: 100,
        passingMarks: 33,
        isCompulsory: true,
      },
    ];

    for (const cs of class9Subjects) {
      if (cs.subjectId) {
        const existing = await prisma.academicClassSubject.findFirst({
          where: {
            classId: class9.id,
            subjectId: cs.subjectId,
          },
        });

        if (!existing) {
          await prisma.academicClassSubject.create({
            data: {
              classId: class9.id,
              ...cs,
            },
          });
          mappingsCreated++;
        }
      }
    }
  }

  console.log(` Created ${mappingsCreated} class-subject mappings\n`);
  console.log(" Seeding Book Categories...");
 
  const bookCategories = [
    { name: "বাংলা সাহিত্য", description: "বাংলা উপন্যাস, কবিতা, ছোটগল্প", color: "#E74C3C" },
    { name: "English Literature", description: "Novels, poetry, short stories in English", color: "#3498DB" },
    { name: "বিজ্ঞান", description: "পদার্থ, রসায়ন, জীববিজ্ঞান বই", color: "#2ECC71" },
    { name: "গণিত", description: "গণিত, পরিসংখ্যান, ক্যালকুলাস", color: "#9B59B6" },
    { name: "ইতিহাস ও সমাজবিজ্ঞান", description: "ইতিহাস, ভূগোল, সামাজিক বিজ্ঞান", color: "#F39C12" },
    { name: "ধর্মীয় বই", description: "ইসলামিক বই, কুরআন, হাদিস", color: "#1ABC9C" },
    { name: "তথ্যপ্রযুক্তি", description: "কম্পিউটার, প্রোগ্রামিং, ICT", color: "#E67E22" },
    { name: "রেফারেন্স", description: "অভিধান, এনসাইক্লোপিডিয়া, গাইড বই", color: "#95A5A6" },
    { name: "শিশু সাহিত্য", description: "শিশু ও কিশোর উপযোগী বই", color: "#FF69B4" },
    { name: "বাণিজ্য ও অর্থনীতি", description: "ব্যবসা, হিসাববিজ্ঞান, অর্থনীতি", color: "#CD853F" },
  ];
   
  let categoriesCreated = 0;
  const createdCategories = {};
   
  for (const cat of bookCategories) {
    const existing = await prisma.bookCategory.findFirst({
      where: { name: cat.name, institutionId: demoInstitution.id },
    });
   
    if (!existing) {
      const created = await prisma.bookCategory.create({
        data: { ...cat, institutionId: demoInstitution.id },
      });
      createdCategories[cat.name] = created.id;
      categoriesCreated++;
    } else {
      createdCategories[cat.name] = existing.id;
    }
  }
   
  console.log(` Created ${categoriesCreated} book categories\n`);
   
  // ========================================
  // 6. SEED DEMO BOOKS
  // ========================================
  console.log("Seeding Demo Books...");
   
  const demoBooks = [
    {
      title: "বাংলাদেশের ইতিহাস",
      author: "ড. আব্দুল করিম",
      isbn: "978-984-001-001",
      publisher: "বাংলা একাডেমি",
      edition: "৫ম সংস্করণ",
      language: "Bengali",
      totalCopies: 5,
      publishedYear: 2018,
      shelfNumber: "A-1",
      categoryName: "ইতিহাস ও সমাজবিজ্ঞান",
      description: "বাংলাদেশের স্বাধীনতা সংগ্রাম ও ইতিহাস",
    },
    {
      title: "Physics for SSC",
      author: "Prof. Rahman",
      isbn: "978-984-002-001",
      publisher: "Panjeree Publications",
      edition: "3rd Edition",
      language: "Bengali",
      totalCopies: 10,
      publishedYear: 2022,
      shelfNumber: "B-2",
      categoryName: "বিজ্ঞান",
      description: "SSC Physics reference book",
    },
    {
      title: "উচ্চতর গণিত - একাদশ-দ্বাদশ শ্রেণী",
      author: "মো. আব্দুস সালাম",
      isbn: "978-984-003-001",
      publisher: "Hasan Book House",
      edition: "৭ম সংস্করণ",
      language: "Bengali",
      totalCopies: 8,
      publishedYear: 2021,
      shelfNumber: "C-1",
      categoryName: "গণিত",
      description: "উচ্চ মাধ্যমিক গণিত",
    },
    {
      title: "গল্পগুচ্ছ",
      author: "রবীন্দ্রনাথ ঠাকুর",
      isbn: "978-984-004-001",
      publisher: "বিশ্বভারতী",
      edition: "১৫তম সংস্করণ",
      language: "Bengali",
      totalCopies: 3,
      publishedYear: 2015,
      shelfNumber: "D-1",
      categoryName: "বাংলা সাহিত্য",
      description: "রবীন্দ্রনাথের বিখ্যাত ছোটগল্প সংকলন",
    },
    {
      title: "Introduction to Programming with Python",
      author: "Mark Lutz",
      isbn: "978-984-005-001",
      publisher: "O'Reilly Media",
      edition: "5th Edition",
      language: "English",
      totalCopies: 4,
      publishedYear: 2020,
      shelfNumber: "E-1",
      categoryName: "তথ্যপ্রযুক্তি",
      description: "Beginner's guide to Python programming",
    },
  ];
   
  let booksCreated = 0;
   
  for (const book of demoBooks) {
    const categoryId = createdCategories[book.categoryName];
    if (!categoryId) continue;
   
    const existing = await prisma.book.findFirst({
      where: { isbn: book.isbn, institutionId: demoInstitution.id },
    });
   
    if (!existing) {
      const { categoryName, ...bookData } = book;
      await prisma.book.create({
        data: {
          ...bookData,
          availableCopies: bookData.totalCopies,
          categoryId,
          institutionId: demoInstitution.id,
          status: "AVAILABLE",
        },
      });
      booksCreated++;
    }
  }
   
  console.log(`  Created ${booksCreated} demo books\n`);


  console.log(" Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(" Error during seeding :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
