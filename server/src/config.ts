import { z } from "zod";

const envSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required (see server/.env.example)"),
  PORT: z.coerce.number().int().positive().default(3001),
  DB_PATH: z.string().default("./data/inbox.db"),
  GEMINI_CHAT_MODEL: z.string().default("gemini-3.8-flash"),
  GEMINI_EMBED_MODEL: z.string().default("gemini-embedding-001"),
  EMBED_DIMENSIONS: z.coerce.number().int().positive().default(768),
  RETRIEVAL_TOP_K: z.coerce.number().int().min(1).max(20).default(5),
  RETRIEVAL_MIN_SCORE: z.coerce.number().min(-1).max(1).default(0.55),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n  ");
    throw new Error(`Invalid configuration:\n  ${problems}`);
  }
  return parsed.data;
}
