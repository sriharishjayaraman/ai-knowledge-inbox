import { z } from "zod";

const title = z.string().trim().min(1).max(120).optional();

export const ingestBodySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("note"),
    text: z.string().trim().min(1, "text must not be empty").max(50_000, "text must be at most 50,000 characters"),
    title,
  }),
  z.object({
    type: z.literal("url"),
    url: z
      .string()
      .trim()
      .url("url must be a valid URL")
      .refine((u) => /^https?:\/\//i.test(u), "url must start with http:// or https://"),
    title,
  }),
]);

export const queryBodySchema = z.object({
  question: z.string().trim().min(3, "question must be at least 3 characters").max(1000),
});

export type IngestInput = z.infer<typeof ingestBodySchema>;
