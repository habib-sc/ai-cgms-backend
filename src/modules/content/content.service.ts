import { env } from "../../config/env";
import { contentGenerationQueue } from "../../config/queue";
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
  const content = await Content.findOne({
    jobId: jobId as string,
    userId: userId as string,
  }).select("-prompt -generatedContent");
  if (!content) {
    throw new Error("Content job not found");
  }
  return content;
};
