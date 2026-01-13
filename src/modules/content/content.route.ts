// d:\My Works\Projects\AI CGMS\codebase\ai-cgms-backend\src\modules\content\content.route.ts
import { Router } from "express";
import { protect } from "../auth/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import {
  generateContentController,
  getContentStatusController,
} from "./content.controller";
import { generateContentSchema } from "./content.validation";

const router = Router();

// Protect all content routes
router.use(protect);

// generate content
router.post(
  "/generate",
  validate(generateContentSchema),
  generateContentController
);

// job status
router.get("/:jobId/status", getContentStatusController);

export const contentRoutes = router;
