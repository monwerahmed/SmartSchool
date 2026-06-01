import express from "express";
import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { authController } from "./auth.controller.js";
import { authValidation } from "./auth.validation.js";

const router = express.Router();

router.post(
  "/login",
  validateRequest(authValidation.loginValidationSchema),
  authController.loginUser,
);
router.post("/logout", auth(), authController.logoutUser);

export const authRoutes = router;
