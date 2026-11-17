import type { ChatProvider, EmbeddingProvider } from "../ai/types.js";
import type { ChunksRepo } from "../db/chunksRepo.js";
import type { SourceType } from "../db/itemsRepo.js";
import type { Logger } from "../logger.js";
import { buildPrompt, extractCitations, SYSTEM_INSTRUCTION } from "./prompt.js";
import { topKBySimilarity } from "./retriever.js";

export interface QuerySource {
  ref: number;
  itemId: string;
  chunkId: string;
  title: string;
  sourceType: SourceType;
  url: string | null;
  snippet: string;
  score: number;
  cited: boolean;
}

export interface QueryResult {
  answer: string;
  grounded: boolean;
  sources: QuerySource[];
}

interface Deps {
  chunks: ChunksRepo;
  embedder: EmbeddingProvider;
  chat: ChatProvider;
  logger: Logger;
  topK: number;
  minScore: number;
}

export class QueryService {
  constructor(private readonly deps: Deps) {}

  async answer(question: string): Promise<QueryResult> {
    const candidates = this.deps.chunks.listSearchable();
    if (candidates.length === 0) {
      return { answer: "Your inbox has no indexed content yet. Add a note or URL first.", grounded: false, sources: [] };
    }

    const queryVector = await this.deps.embedder.embedQuery(question);
    const hits = topKBySimilarity(queryVector, candidates, this.deps.topK, this.deps.minScore);
    this.deps.logger.info(
      { candidates: candidates.length, hits: hits.length, topScore: hits[0]?.score },
      "retrieval done",
    );

    if (hits.length === 0) {
      return { answer: "I couldn't find anything in your saved items related to that question.", grounded: false, sources: [] };
    }

    const answer = await this.deps.chat.generate(SYSTEM_INSTRUCTION, buildPrompt(question, hits));
    const cited = extractCitations(answer, hits.length);

    return {
      answer,
      grounded: cited.size > 0,
      sources: hits.map((h, i) => ({
        ref: i + 1,
        itemId: h.itemId,
        chunkId: h.id,
        title: h.itemTitle,
        sourceType: h.itemSourceType,
        url: h.itemUrl,
        snippet: h.text,
        score: Number(h.score.toFixed(4)),
        cited: cited.has(i + 1),
      })),
    };
  }
}
