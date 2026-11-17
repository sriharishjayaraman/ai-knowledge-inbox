import { GoogleGenAI } from "@google/genai";
import { AppError } from "../http/errors.js";
import type { Logger } from "../logger.js";
import type { ChatProvider, EmbeddingProvider } from "./types.js";

const EMBED_BATCH_SIZE = 100;

interface GeminiOptions {
  apiKey: string;
  chatModel: string;
  embedModel: string;
  embedDimensions: number;
  logger: Logger;
}

type TaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

export class GeminiClient implements EmbeddingProvider, ChatProvider {
  private readonly ai: GoogleGenAI;

  constructor(private readonly opts: GeminiOptions) {
    this.ai = new GoogleGenAI({ apiKey: opts.apiKey });
  }

  async embedDocuments(texts: string[]): Promise<Float32Array[]> {
    const out: Float32Array[] = [];
    for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
      out.push(...(await this.embed(texts.slice(i, i + EMBED_BATCH_SIZE), "RETRIEVAL_DOCUMENT")));
    }
    return out;
  }

  async embedQuery(text: string): Promise<Float32Array> {
    const [vector] = await this.embed([text], "RETRIEVAL_QUERY");
    return vector;
  }

  async generate(systemInstruction: string, prompt: string): Promise<string> {
    const started = Date.now();
    const res = await this.call("generate", () =>
      this.ai.models.generateContent({
        model: this.opts.chatModel,
        contents: prompt,
        config: { systemInstruction, temperature: 0.2 },
      }),
    );
    this.opts.logger.info({ model: this.opts.chatModel, ms: Date.now() - started, usage: res.usageMetadata }, "llm generate");
    const text = res.text?.trim();
    if (!text) throw new AppError("AI_PROVIDER_ERROR", "The AI provider returned an empty answer");
    return text;
  }

  private async embed(texts: string[], taskType: TaskType): Promise<Float32Array[]> {
    const res = await this.call("embed", () =>
      this.ai.models.embedContent({
        model: this.opts.embedModel,
        contents: texts,
        config: { taskType, outputDimensionality: this.opts.embedDimensions },
      }),
    );
    const vectors = (res.embeddings ?? []).map((e) => normalize(Float32Array.from(e.values ?? [])));
    if (vectors.length !== texts.length) {
      throw new AppError("AI_PROVIDER_ERROR", `Expected ${texts.length} embeddings, got ${vectors.length}`);
    }
    return vectors;
  }

  private async call<T>(op: string, fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      const status = (err as { status?: number }).status;
      this.opts.logger.error({ err, op, upstreamStatus: status }, "gemini call failed");
      if (status === 429) throw new AppError("AI_RATE_LIMITED", "The AI provider is rate limiting requests. Try again shortly.");
      throw new AppError("AI_PROVIDER_ERROR", `AI provider ${op} failed${status ? ` (HTTP ${status})` : ""}`);
    }
  }
}

// Unit length, so cosine similarity is a plain dot product. Truncated Gemini vectors are not pre-normalised.
function normalize(v: Float32Array): Float32Array {
  const norm = Math.hypot(...v);
  return norm === 0 ? v : v.map((x) => x / norm);
}
