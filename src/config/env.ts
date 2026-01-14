import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default("5000"),
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
  JWT_ACCESS_SECRET: z.string().min(1, "JWT_ACCESS_SECRET is required"),
  JWT_REFRESH_SECRET: z.string().min(1, "JWT_REFRESH_SECRET is required"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  GEMINI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  DEFAULT_AI_PROVIDER: z.enum(["gemini", "openai"]).default("gemini"),
  DEFAULT_OPENAI_MODEL: z.string().default("gpt-3.5-turbo"),
  DEFAULT_GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  QUEUE_JOB_DELAY_MS: z.string().default("60000"),
  FRONTEND_ORIGIN: z.string().default("http://localhost:3000"),
});

export const env = envSchema.parse(process.env);
