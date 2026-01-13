import { StatusCodes } from "http-status-codes";
import { env } from "../../config/env";
import { contentGenerationQueue } from "../../config/queue";
import { ApiError } from "../../utils/ApiError";
import { Content } from "./content.model";

// generate content
export const generateContent = async (
  bodyData: {
    prompt: string;
    contentType: string;
    model?: string;
    provider?: "gemini" | "openai";
  },
  userId: string
) => {
  const { prompt, contentType, model, provider } = bodyData;

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
      provider: provider || env.DEFAULT_AI_PROVIDER || "gemini",
      model:
        model ||
        ((provider || env.DEFAULT_AI_PROVIDER || "gemini") === "openai"
          ? env.DEFAULT_OPENAI_MODEL
          : env.DEFAULT_GEMINI_MODEL),
    },
    {
      delay: env.QUEUE_JOB_DELAY_MS ? Number(env.QUEUE_JOB_DELAY_MS) : 60000,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000, // Start with 5 seconds backoff
      },
      jobId: newContent.jobId, // same jobId for BullMQ
    }
  );

  // return content
  return newContent;
};

// get job status by job id
export const getJobStatusByJobId = async (userId: string, jobId: string) => {
  const content = await Content.findOne({ jobId, userId }).select(
    "-prompt -generatedContent"
  );
  if (!content) throw new Error("Content job not found");
  return content;
};

export const listContents = async (
  userId: string,
  query: any
): Promise<{
  items: any[];
  meta: { page: number; limit: number; total: number; pages: number };
}> => {
  const page = query.page ? Number(query.page) : 1;
  const limit = query.limit ? Number(query.limit) : 10;
  const filter: any = { userId };
  if (query.status) filter.status = query.status;
  if (query.contentType) filter.contentType = query.contentType;
  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
    if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
  }
  if (query.search) {
    const r = new RegExp(query.search, "i");
    filter.$or = [
      { prompt: r },
      { generatedContent: r },
      { tags: r },
      { notes: r },
      { contentType: r },
      { title: r },
    ];
  }
  const [items, total] = await Promise.all([
    Content.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Content.countDocuments(),
  ]);
  return {
    items,
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

export const getContentById = async (userId: string, id: string) => {
  const doc = await Content.findOne({ _id: id, userId });
  if (!doc) throw new Error("Content not found");
  return doc;
};

export const getContentByJobId = async (userId: string, jobId: string) => {
  const doc = await Content.findOne({ jobId, userId });
  if (!doc) throw new Error("Content not found");
  return doc;
};

export const updateContentMeta = async (
  userId: string,
  id: string,
  body: { title?: string; tags?: string[]; notes?: string }
) => {
  const doc = await Content.findOneAndUpdate(
    { _id: id, userId },
    {
      $set: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.tags !== undefined && { tags: body.tags }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
    },
    { new: true }
  );
  if (!doc) throw new Error("Content not found");
  return doc;
};

export const regenerateContent = async (
  userId: string,
  id: string,
  opts: { provider?: "gemini" | "openai"; model?: string }
) => {
  const doc = await Content.findOne({ _id: id, userId });
  if (!doc) throw new Error("Content not found");
  const newJobId = new Content()._id.toString();
  await Content.findByIdAndUpdate(id, {
    status: "pending",
    generatedContent: "",
    contentError: "",
    jobId: newJobId,
  });

  const provider = opts.provider || env.DEFAULT_AI_PROVIDER || "gemini";
  const model =
    opts.model ||
    (provider === "openai"
      ? env.DEFAULT_OPENAI_MODEL
      : env.DEFAULT_GEMINI_MODEL);

  await contentGenerationQueue.add(
    "generate-ai-content",
    {
      contentId: id,
      prompt: doc.prompt,
      contentType: doc.contentType,
      userId,
      provider,
      model,
    },
    {
      delay: env.QUEUE_JOB_DELAY_MS ? Number(env.QUEUE_JOB_DELAY_MS) : 60000,
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      jobId: newJobId,
    }
  );

  return await Content.findById(id);
};

// delete content
export const deleteContent = async (userId: string, id: string) => {
  const deleted = await Content.findOneAndDelete({ _id: id, userId });
  if (!deleted) throw new ApiError(StatusCodes.NOT_FOUND, "Content not found");
  return deleted;
};
