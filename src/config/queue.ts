import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "./env";

const connection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// queue for content generation
export const contentGenerationQueue = new Queue("contentGeneration", {
  connection,
});

export interface ContentGenerationJob {
  contentId: string;
  prompt: string;
  contentType: string;
  userId: string;
  model?: string;
  provider?: "gemini" | "openai";
}
