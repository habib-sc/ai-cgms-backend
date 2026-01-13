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
      status: "success",
      message: "Content generation job enqueued successfully.",
      data: {
        jobId: newContent.jobId,
        expectedCompletion: new Date(
          Date.now() +
            (env.QUEUE_JOB_DELAY_MS ? Number(env.QUEUE_JOB_DELAY_MS) : 60000)
        ),
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
      status: "success",
      data: content,
    });
  }
);

export const listContentsController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const result = await listContents(userId, req.query);
    res
      .status(StatusCodes.OK)
      .json({ status: "success", data: result.items, meta: result.meta });
  }
);

export const getContentByIdController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { id } = req.params as any;
    const doc = await getContentById(userId, id);
    res.status(StatusCodes.OK).json({ status: "success", data: doc });
  }
);

export const getContentByJobIdController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { jobId } = req.params as any;
    const doc = await getContentById(userId, jobId);
    res.status(StatusCodes.OK).json({ status: "success", data: doc });
  }
);

export const updateContentMetaController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { id } = req.params as any;
    const doc = await updateContentMeta(userId, id, req.body);
    res.status(StatusCodes.OK).json({ status: "success", data: doc });
  }
);

export const regenerateContentController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { id } = req.params as any;
    const updated = await regenerateContent(userId, id, req.body);
    res.status(StatusCodes.ACCEPTED).json({
      status: "success",
      message: "Regeneration enqueued",
      data: { jobId: (updated as any).jobId, contentId: (updated as any)._id },
    });
  }
);

export const deleteContentController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { id } = req.params as any;
    await deleteContent(userId, id);
    res.status(StatusCodes.NO_CONTENT).json({
      status: "success",
      message: "Content deleted successfully",
    });
  }
);
