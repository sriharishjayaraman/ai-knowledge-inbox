import { randomUUID } from "node:crypto";
import type { EmbeddingProvider } from "../ai/types.js";
import type { ChunksRepo } from "../db/chunksRepo.js";
import type { Item, ItemsRepo } from "../db/itemsRepo.js";
import type { Logger } from "../logger.js";
import type { IngestInput } from "../routes/schemas.js";
import { chunkText } from "./chunker.js";
import type { FetchedPage } from "./urlFetcher.js";

interface Deps {
  items: ItemsRepo;
  chunks: ChunksRepo;
  embedder: EmbeddingProvider;
  fetchPage: (url: string) => Promise<FetchedPage>;
  logger: Logger;
}

const TITLE_MAX = 120;

export class IngestService {
  constructor(private readonly deps: Deps) {}

  // Fetching happens inline so a bad URL fails the request; embedding runs in the background.
  async ingest(input: IngestInput): Promise<Item> {
    const { rawContent, title, url } = await this.resolveContent(input);
    const item = this.deps.items.insert({
      id: randomUUID(),
      sourceType: input.type,
      title: clampTitle(input.title || title),
      url,
      rawContent,
      createdAt: new Date().toISOString(),
    });
    this.deps.logger.info({ itemId: item.id, sourceType: item.sourceType, chars: rawContent.length }, "item saved");
    void this.index(item.id, rawContent);
    return item;
  }

  private async resolveContent(input: IngestInput) {
    if (input.type === "note") return { rawContent: input.text, title: input.text.split("\n")[0], url: null };
    const page = await this.deps.fetchPage(input.url);
    return { rawContent: page.text, title: page.title || new URL(input.url).hostname, url: input.url };
  }

  private async index(itemId: string, rawContent: string): Promise<void> {
    const log = this.deps.logger.child({ itemId });
    const started = Date.now();
    try {
      const texts = chunkText(rawContent);
      const vectors = await this.deps.embedder.embedDocuments(texts);
      this.deps.chunks.insertMany(
        texts.map((text, position) => ({ id: randomUUID(), itemId, position, text, embedding: vectors[position] })),
      );
      this.deps.items.markReady(itemId, texts.length);
      log.info({ chunks: texts.length, ms: Date.now() - started }, "item indexed");
    } catch (err) {
      log.error({ err }, "item indexing failed");
      this.deps.items.markFailed(itemId, (err as Error).message);
    }
  }
}

function clampTitle(title: string): string {
  const t = title.trim();
  return t.length > TITLE_MAX ? `${t.slice(0, TITLE_MAX - 1)}…` : t;
}
