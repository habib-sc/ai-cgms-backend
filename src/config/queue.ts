import { Queue, Worker, Job } from "bullmq";
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
}

// content generation worker
export const contentGenerationWorker = new Worker<ContentGenerationJob>(
  "contentGeneration",
  async (job: Job<ContentGenerationJob>) => {
    const { contentId, prompt, contentType, userId } = job.data;
    console.log(
      `Processing job ${job.id} for contentId: ${contentId}, prompt: "${prompt}", contentType: "${contentType}"`
    );

    // simulate AI API call delay and processing
    await new Promise((resolve) => setTimeout(resolve, 10000)); // Simulate 10 seconds AI processing

    const generatedContent = `This is a placeholder content for ${contentType} based on the prompt: "${prompt}"`;

    console.log(
      `Job ${job.id} completed. Generated content: ${generatedContent}`
    );
  },
  { connection }
);

// Handle worker events (for logging and debugging)
contentGenerationWorker.on("completed", (job) => {
  console.log(`Job ${job.id} has completed!`);
});

contentGenerationWorker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} has failed with error: ${err.message}`);
});

contentGenerationWorker.on("error", (err) => {
  console.error(`Worker experienced an error: ${err.message}`);
});

console.log("BullMQ queue and worker running");
