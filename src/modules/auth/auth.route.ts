import { Router } from "express";
import * as controller from "./auth.controller";
import { validate } from "../../middlewares/validate.middleware";
import { loginSchema, registerSchema } from "./auth.validation";
import { protect } from "./auth.middleware";

const router = Router();

router.post(
  "/register",
  validate(registerSchema),
  controller.registerController
);
router.post("/login", validate(loginSchema), controller.loginController);

router.get("/me", protect, controller.profileController);

export const authRoutes = router;
