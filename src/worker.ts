import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
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
const pub = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});
const publishStatus = (payload: any) =>
  pub
    .publish("job-status", JSON.stringify(payload))
    .catch((err) =>
      console.error("[Worker] Failed to publish job-status:", err)
    );

// Initialize Google Generative AI
console.log("[Worker] Initializing Google Generative AI...");
let genAI: GoogleGenerativeAI | null = null;
if (env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
}
console.log("[Worker] Google Generative AI initialized.");

// Initialize OpenAI
console.log("[Worker] Initializing OpenAI...");
const openai = env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: env.OPENAI_API_KEY })
  : null;
console.log("[Worker] OpenAI initialized.");
const getGuidelines = (type: string) => {
  switch (type) {
    case "blog-post-outline":
      return "Start directly with a working title, then H2 sections each with 3–5 bullets. No meta prefaces.";
    case "blog-post":
      return "Write a complete blog with H1 title, intro, several H2/H3 sections, and a conclusion. No meta prefaces.";
    case "product-description":
      return "Provide a concise product description with features and benefits. No meta prefaces.";
    case "social-media-caption":
      return "Return a single caption under 280 characters, catchy and concise. No meta prefaces.";
    case "email-subject-line":
      return "Return 5 short subject lines, each on its own line. No meta prefaces.";
    case "ad-copy":
      return "Return concise ad copy (headline + body). No meta prefaces.";
    default:
      return "Return only the requested content and avoid meta prefaces.";
  }
};

// the worker
const contentGenerationWorker = new Worker<ContentGenerationJob>(
  "contentGeneration", // Must match the queue name
  async (job: Job<ContentGenerationJob>) => {
    console.log(`[Worker] Job ${job.id} started processing.`); // Added for early debugging
    const provider = job.data.provider || env.DEFAULT_AI_PROVIDER || "gemini";
    console.log(
      `[Worker] Processing job ${job.id} for contentId: ${job.data.contentId}, prompt: "${job.data.prompt}", contentType: "${job.data.contentType}", model: "${job.data.model}", provider: "${provider}"`
    );

    let generatedContent = "";
    let contentError: string | undefined;
    let status: "completed" | "failed" = "failed";
    let errorMessage: string | undefined;

    try {
      if (provider === "openai" && openai) {
        const openaiModel =
          job.data.model && job.data.model.startsWith("gpt")
            ? job.data.model
            : env.DEFAULT_OPENAI_MODEL || "gpt-3.5-turbo";
        const params: any = {
          model: openaiModel,
          messages: [
            {
              role: "system",
              content: `You are a writing assistant. Return only the ${
                job.data.contentType
              }. ${getGuidelines(job.data.contentType)}`,
            },
            {
              role: "user",
              content: `Topic: "${job.data.prompt}".`,
            },
          ],
        };
        const completion = await openai.chat.completions.create(params);
        const raw = completion.choices[0]?.message?.content || "";
        generatedContent = raw;
        status = "completed";
        console.log(
          `[Worker] Job ${job.id} AI generation successful using OpenAI.`
        );
      } else if (provider === "gemini" && genAI) {
        const geminiModel =
          job.data.model && job.data.model.startsWith("gemini")
            ? job.data.model
            : env.DEFAULT_GEMINI_MODEL || "gemini-2.5-flash";
        const model = genAI.getGenerativeModel({
          model: geminiModel,
        });
        const fullPrompt = `Produce ${job.data.contentType} for topic "${
          job.data.prompt
        }". ${getGuidelines(job.data.contentType)} Output only the content.`;
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        generatedContent = response.text();
        status = "completed";
        console.log(
          `[Worker] Job ${job.id} AI generation successful using Gemini.`
        );
      }
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
contentGenerationWorker.on("active", async (job) => {
  console.log(`[Worker] Job ${job.id} is now active!`);
  try {
    await Content.findByIdAndUpdate((job.data as any).contentId, {
      status: "processing",
    });
  } catch {}
  publishStatus({
    type: "content-generation",
    jobId: job.id,
    userId: (job.data as any).userId,
    status: "processing",
    contentId: (job.data as any).contentId,
  });
});

contentGenerationWorker.on("completed", (job) => {
  console.log(`[Worker] Job ${job.id} has completed!`);
  publishStatus({
    type: "content-generation",
    jobId: job.id,
    userId: (job.data as any).userId,
    status: "completed",
    contentId: (job.data as any).contentId,
  });
});

contentGenerationWorker.on("failed", (job, err) => {
  console.error(
    `[Worker] Job ${job?.id} has failed with error: ${err.message}`
  );
  publishStatus({
    type: "content-generation",
    jobId: job?.id,
    userId: (job?.data as any)?.userId,
    status: "failed",
    contentId: (job?.data as any)?.contentId,
    error: err.message,
  });
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
