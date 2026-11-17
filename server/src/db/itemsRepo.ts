import type { Db } from "./database.js";

export type SourceType = "note" | "url";
export type ItemStatus = "processing" | "ready" | "failed";

export interface NewItem {
  id: string;
  sourceType: SourceType;
  title: string;
  url: string | null;
  rawContent: string;
  createdAt: string;
}

// What the API returns: a short preview instead of the full raw content.
export interface Item {
  id: string;
  sourceType: SourceType;
  title: string;
  url: string | null;
  preview: string;
  status: ItemStatus;
  error: string | null;
  chunkCount: number;
  createdAt: string;
}

const PREVIEW_CHARS = 280;
const SELECT_ITEM = `
  SELECT id, source_type AS sourceType, title, url, substr(raw_content, 1, ${PREVIEW_CHARS}) AS preview,
         status, error, chunk_count AS chunkCount, created_at AS createdAt
  FROM items`;

export class ItemsRepo {
  constructor(private readonly db: Db) {}

  insert(item: NewItem): Item {
    this.db
      .prepare(
        `INSERT INTO items (id, source_type, title, url, raw_content, status, created_at)
         VALUES (@id, @sourceType, @title, @url, @rawContent, 'processing', @createdAt)`,
      )
      .run(item);
    return this.db.prepare(`${SELECT_ITEM} WHERE id = ?`).get(item.id) as Item;
  }

  list(): Item[] {
    return this.db.prepare(`${SELECT_ITEM} ORDER BY created_at DESC`).all() as Item[];
  }

  markReady(id: string, chunkCount: number): void {
    this.db.prepare(`UPDATE items SET status = 'ready', error = NULL, chunk_count = ? WHERE id = ?`).run(chunkCount, id);
  }

  markFailed(id: string, error: string): void {
    this.db.prepare(`UPDATE items SET status = 'failed', error = ? WHERE id = ?`).run(error, id);
  }

  failStaleProcessing(): number {
    return this.db
      .prepare(`UPDATE items SET status = 'failed', error = 'Server restarted before processing finished' WHERE status = 'processing'`)
      .run().changes;
  }
}
