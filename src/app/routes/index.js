import express from "express";
import { academicClassRoutes } from "../modules/academicClass/academicClass.routes.js";
import { authRoutes } from "../modules/auth/auth.routes.js";
import { instituteRoute } from "../modules/institute/institute.routes.js";
import { sectionRoutes } from "../modules/section/section.routes.js";
import { userRoutes } from "../modules/user/user.routes.js";
import { studentRoutes } from "../modules/student/student.routes.js";
import { teacherRoutes } from "../modules/teacher/teacher.routes.js";
import { guardianRoutes } from "../modules/guardian/guardian.routes.js";
import { attendanceRoutes } from "../modules/attendance/attendance.routes.js";
import { resultRoutes } from "../modules/result/result.routes.js";
import { libraryRoutes } from "../modules/librarian/library.routes.js";
import { otpRoutes } from "../modules/otp/otp.routes.js";
import { uploadRoutes } from "../modules/upload/upload.routes.js"

const router = express.Router();

const routeModule = [
  {
    path: "/users",
    route: userRoutes,
  },
  {
    path: "/institutes",
    route: instituteRoute,
  },
  {
    path: "/auths",
    route: authRoutes,
  },
  {
    path: "/academic-classes",
    route: academicClassRoutes,
  },
  {
    path: "/sections",
    route: sectionRoutes,
  },
  {
    path: "/students",
    route: studentRoutes,
  },
  {
    path: "/teachers",
    route: teacherRoutes,
  },
  {
    path: "/guardians",
    route: guardianRoutes,
  },
  {
    path: "/attendance",
    route: attendanceRoutes,
  },
  {
    path: "/results",
    route: resultRoutes,
  },
  {
    path: "/librarian",
    route: libraryRoutes, 
  },
  {
    path: "/otp",
    route: otpRoutes,
  },
  {
    path: "/upload",
    route: uploadRoutes,
  },
];

routeModule.forEach((route) => {
  router.use(route.path, route.route);
});

export const MainRoute = router;
