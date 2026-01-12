import { z } from "zod";

// Zod schema for content generation request body
export const generateContentSchema = z.object({
  body: z.object({
    prompt: z
      .string()
      .min(1, "Prompt cannot be empty")
      .max(1000, "Prompt too long"),
    contentType: z.enum([
      "blog-post-outline",
      "blog-post",
      "product-description",
      "social-media-caption",
      "email-subject-line",
      "ad-copy",
    ]),
  }),
});
