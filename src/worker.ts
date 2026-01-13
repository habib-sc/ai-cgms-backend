import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "./config/env";
import { connectDB } from "./config/db";
import { ContentGenerationJob } from "./config/queue";
import { Content } from "./modules/content/content.model";

// Connect to MongoDB
console.log("[Worker] Attempting to connect to MongoDB...");
connectDB();
console.log("[Worker] MongoDB connection initiated.");

// Redis connection for BullMQ worker
console.log("[Worker] Attempting to connect to Redis...");
const connection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// Add Redis connection health logging
connection.on("connect", () =>
  console.log("[Worker] Redis connection successful")
);
connection.on("error", (err) =>
  console.error("[Worker] Redis connection error:", err)
);
connection.on("close", () => console.log("[Worker] Redis connection closed"));

console.log("[Worker] Redis connection initiated.");

// Initialize Google Generative AI
console.log("[Worker] Initializing Google Generative AI...");
const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
console.log("[Worker] Google Generative AI initialized.");

// the worker
const contentGenerationWorker = new Worker<ContentGenerationJob>(
  "contentGeneration", // Must match the queue name
  async (job: Job<ContentGenerationJob>) => {
    console.log(`[Worker] Job ${job.id} started processing.`); // Added for early debugging
    console.log(
      `[Worker] Processing job ${job.id} for contentId: ${job.data.contentId}, prompt: "${job.data.prompt}", contentType: "${job.data.contentType}"`
    );

    let generatedContent = "";
    let contentError: string | undefined;
    let status: "completed" | "failed" = "failed";
    let errorMessage: string | undefined;

    try {
      // Get the generative model
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      // Construct the AI prompt based on content type
      const fullPrompt = `Generate a ${job.data.contentType} based on the following topic/prompt: "${job.data.prompt}".`;

      // Call the Google Gemini API
      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      generatedContent = response.text();
      status = "completed";

      console.log(`[Worker] Job ${job.id} AI generation successful.`);
    } catch (error: any) {
      console.error(`[Worker] Job ${job.id} AI generation failed:`, error);
      errorMessage = error.message || "AI generation failed";
      status = "failed";
      contentError = `Error generating content: ${errorMessage}`;
    } finally {
      // Update the Content document in MongoDB
      try {
        await Content.findByIdAndUpdate(
          job.data.contentId,
          {
            generatedContent: generatedContent,
            contentError: contentError,
            status: status,
            ...(errorMessage && { errorMessage: errorMessage }),
          },
          { new: true } // Return the updated document
        );
        console.log(
          `[Worker] ContentId ${job.data.contentId} updated in MongoDB with status: ${status}`
        );
      } catch (dbError: any) {
        console.error(
          `[Worker] Failed to update MongoDB for contentId ${job.data.contentId}:`,
          dbError
        );
      }
    }
  },
  { connection } // pass the Redis connection
);

// Handle worker events for logging
contentGenerationWorker.on("active", (job) => {
  console.log(`[Worker] Job ${job.id} is now active!`);
});

contentGenerationWorker.on("completed", (job) => {
  console.log(`[Worker] Job ${job.id} has completed!`);
});

contentGenerationWorker.on("failed", (job, err) => {
  console.error(
    `[Worker] Job ${job?.id} has failed with error: ${err.message}`
  );
});

contentGenerationWorker.on("error", (err) => {
  console.error(`[Worker] Worker experienced an error: ${err.message}`);
});

console.log("[Worker] BullMQ Worker started and listening for jobs."); // Updated log message

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("[Worker] Shutting down worker..."); // Updated log message
  await contentGenerationWorker.close();
  await connection.disconnect();
  console.log("[Worker] Worker gracefully shut down."); // Updated log message
  process.exit(0);
});
