import { Request, Response, NextFunction } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { StatusCodes } from "http-status-codes";
import { ApiError } from "../../utils/ApiError";
import {
  generateContent,
  getJobStatusByJobId,
  listContents,
  getContentById,
  updateContentMeta,
  regenerateContent,
  deleteContent,
} from "./content.service";
import { env } from "../../config/env";

export const generateContentController = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user.id;

    // generate content
    const newContent = await generateContent(req.body, userId);

    if (!newContent.jobId)
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to generate content job ID"
      );

    // return immediate response with 202
    res.status(StatusCodes.ACCEPTED).json({
      success: true,
      message: "Content generation job enqueued successfully.",
      data: {
        jobId: newContent.jobId,
        expectedDelayMs: env.QUEUE_JOB_DELAY_MS
          ? Number(env.QUEUE_JOB_DELAY_MS)
          : 60000,
        contentId: newContent._id,
      },
    });
  }
);

// polling job status controller
export const getContentStatusController = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const jobId = req.params.jobId as string;
    const userId = (req as any).user.id;

    if (!userId)
      throw new ApiError(StatusCodes.UNAUTHORIZED, "User not authenticated");

    if (!jobId)
      throw new ApiError(StatusCodes.BAD_REQUEST, "Job ID is required");

    const content = await getJobStatusByJobId(userId, jobId);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Content job status retrieved successfully",
      data: content,
    });
  }
);

// list contents controller
export const listContentsController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const result = await listContents(userId, req.query);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Contents found",
      meta: result.meta,
      data: result.items,
    });
  }
);

// get content by id controller
export const getContentByIdController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { id } = req.params as any;
    const doc = await getContentById(userId, id);
    res
      .status(StatusCodes.OK)
      .json({ success: true, message: "Content found", data: doc });
  }
);

// update content metadata controller
export const updateContentMetaController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { id } = req.params as any;
    const doc = await updateContentMeta(userId, id, req.body);
    res
      .status(StatusCodes.OK)
      .json({ success: true, message: "Updated content metadata", data: doc });
  }
);

// regenerate content controller
export const regenerateContentController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { id } = req.params as any;
    const updated = await regenerateContent(userId, id, req.body);
    res.status(StatusCodes.ACCEPTED).json({
      success: true,
      message: "Regeneration enqueued",
      data: { jobId: (updated as any).jobId, contentId: (updated as any)._id },
    });
  }
);

// delete content controller
export const deleteContentController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { id } = req.params as any;
    const deleted = await deleteContent(userId, id);

    if (!deleted?._id)
      throw new ApiError(StatusCodes.BAD_REQUEST, "Content not deleted");

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Content deleted successfully",
    });
  }
);
