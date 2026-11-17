import { pino } from "pino";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { ChatProvider, EmbeddingProvider } from "./ai/types.js";
import { createApp } from "./app.js";
import { ChunksRepo } from "./db/chunksRepo.js";
import { openDatabase } from "./db/database.js";
import { ItemsRepo } from "./db/itemsRepo.js";
import { IngestService } from "./ingest/ingestService.js";
import { QueryService } from "./query/queryService.js";

// Deterministic bag-of-words embedder so retrieval can be tested without an API key.
const VOCAB = ["cat", "dog", "pizza", "rome", "python", "rust"];
const embed = (t: string) => Float32Array.from(VOCAB.map((w) => (t.toLowerCase().includes(w) ? 1 : 0.01)));
const fakeEmbedder: EmbeddingProvider = {
  embedDocuments: async (texts) => texts.map(embed),
  embedQuery: async (text) => embed(text),
};

function setup() {
  const fakeChat = { generate: vi.fn<ChatProvider["generate"]>(async () => "Pizza comes from Naples [1].") };
  const logger = pino({ level: "silent" });
  const db = openDatabase(":memory:");
  const items = new ItemsRepo(db);
  const chunks = new ChunksRepo(db);
  const fetchPage = vi.fn(async () => ({ title: "Rome guide", text: "Rome is famous for pizza al taglio." }));
  const ingest = new IngestService({ items, chunks, embedder: fakeEmbedder, fetchPage, logger });
  const query = new QueryService({ chunks, embedder: fakeEmbedder, chat: fakeChat, logger, topK: 3, minScore: 0.3 });
  return { app: createApp(logger, { items, ingest, query }), fetchPage, fakeChat };
}

const settle = () => new Promise((r) => setTimeout(r, 10));

describe("API", () => {
  it("ingests a note, lists it as ready, and answers with citations", async () => {
    const { app } = setup();

    const ingest = await request(app).post("/ingest").send({ type: "note", text: "Pizza was invented in Naples." });
    expect(ingest.status).toBe(202);
    expect(ingest.body.item).toMatchObject({ sourceType: "note", status: "processing", title: "Pizza was invented in Naples." });

    await settle();
    const list = await request(app).get("/items");
    expect(list.body.items[0]).toMatchObject({ status: "ready", chunkCount: 1 });

    const q = await request(app).post("/query").send({ question: "Where is pizza from?" });
    expect(q.status).toBe(200);
    expect(q.body.grounded).toBe(true);
    expect(q.body.sources[0]).toMatchObject({ ref: 1, cited: true, sourceType: "note" });
  });

  it("ingests a URL using the fetched page title", async () => {
    const { app, fetchPage } = setup();
    const res = await request(app).post("/ingest").send({ type: "url", url: "https://example.com/rome" });
    expect(res.status).toBe(202);
    expect(fetchPage).toHaveBeenCalledWith("https://example.com/rome");
    expect(res.body.item).toMatchObject({ sourceType: "url", title: "Rome guide", url: "https://example.com/rome" });
  });

  it("rejects invalid input with field-level details", async () => {
    const { app } = setup();
    const res = await request(app).post("/ingest").send({ type: "url", url: "ftp://nope" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details[0].field).toBe("url");
  });

  it("returns 400 on malformed JSON and 404 on unknown routes", async () => {
    const { app } = setup();
    const bad = await request(app).post("/query").set("content-type", "application/json").send("{oops");
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe("INVALID_JSON");
    expect((await request(app).get("/nope")).status).toBe(404);
  });

  it("does not call the LLM when nothing relevant is saved", async () => {
    const { app, fakeChat } = setup();
    await request(app).post("/ingest").send({ type: "note", text: "My cat sleeps all day." });
    await settle();
    const res = await request(app).post("/query").send({ question: "Tell me about rust" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ grounded: false, sources: [] });
    expect(fakeChat.generate).not.toHaveBeenCalled();
  });
});
