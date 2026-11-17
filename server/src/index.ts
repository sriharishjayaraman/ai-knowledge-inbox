import { GeminiClient } from "./ai/gemini.js";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { ChunksRepo } from "./db/chunksRepo.js";
import { openDatabase } from "./db/database.js";
import { ItemsRepo } from "./db/itemsRepo.js";
import { IngestService } from "./ingest/ingestService.js";
import { fetchPage } from "./ingest/urlFetcher.js";
import { logger } from "./logger.js";
import { QueryService } from "./query/queryService.js";

function main() {
  const config = loadConfig();
  const db = openDatabase(config.DB_PATH);
  const items = new ItemsRepo(db);
  const chunks = new ChunksRepo(db);

  const stale = items.failStaleProcessing();
  if (stale > 0) logger.warn({ count: stale }, "marked items left processing by a previous run as failed");

  const gemini = new GeminiClient({
    apiKey: config.GEMINI_API_KEY,
    chatModel: config.GEMINI_CHAT_MODEL,
    embedModel: config.GEMINI_EMBED_MODEL,
    embedDimensions: config.EMBED_DIMENSIONS,
    logger,
  });

  const ingest = new IngestService({ items, chunks, embedder: gemini, fetchPage, logger });
  const query = new QueryService({
    chunks,
    embedder: gemini,
    chat: gemini,
    logger,
    topK: config.RETRIEVAL_TOP_K,
    minScore: config.RETRIEVAL_MIN_SCORE,
  });

  const app = createApp(logger, { items, ingest, query });
  const server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT, db: config.DB_PATH, chatModel: config.GEMINI_CHAT_MODEL }, "server listening");
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, "shutting down");
    server.close(() => {
      db.close();
      process.exit(0);
    });
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

try {
  main();
} catch (err) {
  logger.fatal({ err }, (err as Error).message);
  process.exit(1);
}
