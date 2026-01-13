// d:\My Works\Projects\AI CGMS\codebase\ai-cgms-backend\src\modules\content\content.route.ts
import { Router } from "express";
import { protect } from "../auth/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import {
  generateContentController,
  getContentStatusController,
  listContentsController,
  getContentByIdController,
  updateContentMetaController,
  regenerateContentController,
  deleteContentController,
} from "./content.controller";
import {
  generateContentSchema,
  listContentQuerySchema,
  getByIdSchema,
  updateContentMetaSchema,
  regenerateContentSchema,
  deleteSchema,
} from "./content.validation";

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

// list contents
router.get("/", validate(listContentQuerySchema), listContentsController);

// read by id
router.get("/:id", validate(getByIdSchema), getContentByIdController);

// update metadata
router.patch(
  "/:id",
  validate(updateContentMetaSchema),
  updateContentMetaController
);

// regenerate
router.post(
  "/:id/regenerate",
  validate(regenerateContentSchema),
  regenerateContentController
);

// delete
router.delete("/:id", validate(deleteSchema), deleteContentController);

export const contentRoutes = router;
