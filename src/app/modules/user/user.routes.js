import express from "express";
import auth from "../../middlewares/auth.js";
import { requirePermission } from "../../middlewares/permission.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { userControllers } from "./user.controller.js";
import { userValidation } from "./user.validation.js";

const router = express.Router();

/**
 * creating route for user
 */
router.post(
  "/create-user",
  validateRequest(userValidation.createUserValidationSchema),
  userControllers.createUserController
)

router.post(
  "/create-super-admin",
  validateRequest(userValidation.createSuperAdminValidationSchema),
  userControllers.createSuperAdminController,
);

/**
 * Create Admin for institution
 * POST /api/users/create-admin
 * Access: SUPER_ADMIN only
 */
router.post(
  "/create-admin",
  auth("SUPER_ADMIN"),
  requirePermission("USER", "CREATE"),
  validateRequest(userValidation.createAdminValidationSchema),
  userControllers.createAdminController,
);

/**
 * Create Principal for institution
 * POST /api/users/create-principal
 * Access: SUPER_ADMIN or ADMIN
 */
router.post(
  "/create-principal",
  auth("SUPER_ADMIN", "ADMIN"),
  requirePermission("USER", "CREATE"),
  validateRequest(userValidation.createPrincipalValidationSchema),
  userControllers.createPrincipalController,
);

/**
 * Get all user info from db
 */
router.get(
  "/users",
  userControllers.getAllUsersController
);


export const userRoutes = router;
