import { Request, Response, NextFunction } from "express";
import { Content } from "./content.model";
import { contentGenerationQueue } from "../../config/queue";
import { catchAsync } from "../../utils/catchAsync";
import { StatusCodes } from "http-status-codes";
import { ApiError } from "../../utils/ApiError";

// delay for the job in milliseconds (1 minute)
const JOB_DELAY_MS = 60000;

export const generateContentController = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user.id;
    const { prompt, contentType } = req.body;

    if (!userId)
      throw new ApiError(StatusCodes.UNAUTHORIZED, "User not authenticated");

    // creating new content
    const newContent = await Content.create({
      userId,
      prompt,
      contentType,
      status: "pending",
      jobId: new Content()._id.toString(), // mongo db _id as jobId
    });

    // enqueue the job into BullMQ with delay
    const job = await contentGenerationQueue.add(
      "generate-ai-content", // Job name
      {
        contentId: newContent._id.toString(),
        prompt,
        contentType,
        userId,
      },
      {
        delay: JOB_DELAY_MS,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000, // Start with 5 seconds backoff
        },
        jobId: newContent.jobId, // same jobId for BullMQ
      }
    );

    // return immediate response with 202
    res.status(StatusCodes.ACCEPTED).json({
      status: "success",
      message: "Content generation job enqueued successfully.",
      data: {
        jobId: newContent.jobId,
        expectedCompletion: new Date(Date.now() + JOB_DELAY_MS),
        contentId: newContent._id,
      },
    });
  }
);

// polling job status controller
export const getContentStatusController = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { jobId } = req.params;
    const userId = (req as any).user.id;

    if (!userId)
      throw new ApiError(StatusCodes.UNAUTHORIZED, "User not authenticated");

    const content = await Content.findOne({
      jobId: jobId as string,
      userId: userId as string,
    });

    if (!content) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Content job not found");
    }

    res.status(StatusCodes.OK).json({
      status: "success",
      data: {
        jobId: content.jobId,
        contentId: content._id,
        status: content.status,
        generatedContent: content?.generatedContent || "", // empty if pending
        createdAt: content.createdAt,
        updatedAt: content.updatedAt,
      },
    });
  }
);
