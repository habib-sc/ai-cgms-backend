import { z } from "zod";

export const contentTypes = [
  "blog-post-outline",
  "blog-post",
  "product-description",
  "social-media-caption",
  "email-subject-line",
  "ad-copy",
] as const;

export const generateContentSchema = z.object({
  body: z.object({
    prompt: z.string().min(1).max(1000),
    contentType: z.enum(contentTypes),
    model: z.string().optional(),
    provider: z.enum(["gemini", "openai"]).optional(),
    title: z.string().max(200).optional(),
  }),
});

export const listContentQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    status: z.enum(["pending", "completed", "failed"]).optional(),
    contentType: z.enum(contentTypes).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    search: z.string().optional(),
  }),
});

export const getByIdSchema = z.object({ params: z.object({ id: z.string() }) });

export const updateContentMetaSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    title: z.string().max(200).optional(),
    tags: z.array(z.string()).optional(),
    notes: z.string().max(1000).optional(),
  }),
});

export const regenerateContentSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    provider: z.enum(["gemini", "openai"]).optional(),
    model: z.string().optional(),
  }),
});

export const deleteSchema = z.object({
  params: z.object({ id: z.string() }),
});
