import { Router } from "express";
import type { ItemsRepo } from "../db/itemsRepo.js";
import type { IngestService } from "../ingest/ingestService.js";
import type { QueryService } from "../query/queryService.js";
import { ingestBodySchema, queryBodySchema } from "./schemas.js";

interface Deps {
  items: ItemsRepo;
  ingest: IngestService;
  query: QueryService;
}

export function createRouter({ items, ingest, query }: Deps): Router {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  router.post("/ingest", async (req, res) => {
    const item = await ingest.ingest(ingestBodySchema.parse(req.body));
    res.status(202).json({ item });
  });

  router.get("/items", (_req, res) => {
    res.json({ items: items.list() });
  });

  router.post("/query", async (req, res) => {
    const { question } = queryBodySchema.parse(req.body);
    res.json(await query.answer(question));
  });

  return router;
}
