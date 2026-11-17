import type { Db } from "./database.js";
import type { SourceType } from "./itemsRepo.js";

export interface NewChunk {
  id: string;
  itemId: string;
  position: number;
  text: string;
  embedding: Float32Array;
}

export interface StoredChunk {
  id: string;
  itemId: string;
  text: string;
  embedding: Float32Array;
  itemTitle: string;
  itemUrl: string | null;
  itemSourceType: SourceType;
}

// Float32 vectors stored as raw bytes. Copy on read: SQLite buffers are not guaranteed 4-byte aligned.
const toBlob = (v: Float32Array) => Buffer.from(v.buffer, v.byteOffset, v.byteLength);
const fromBlob = (b: Buffer) => new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));

export class ChunksRepo {
  constructor(private readonly db: Db) {}

  insertMany(chunks: NewChunk[]): void {
    const stmt = this.db.prepare(`INSERT INTO chunks (id, item_id, position, text, embedding) VALUES (?, ?, ?, ?, ?)`);
    this.db.transaction(() => {
      for (const c of chunks) stmt.run(c.id, c.itemId, c.position, c.text, toBlob(c.embedding));
    })();
  }

  listSearchable(): StoredChunk[] {
    const rows = this.db
      .prepare(
        `SELECT c.id, c.item_id AS itemId, c.text, c.embedding,
                i.title AS itemTitle, i.url AS itemUrl, i.source_type AS itemSourceType
         FROM chunks c JOIN items i ON i.id = c.item_id
         WHERE i.status = 'ready'`,
      )
      .all() as (Omit<StoredChunk, "embedding"> & { embedding: Buffer })[];
    return rows.map((r) => ({ ...r, embedding: fromBlob(r.embedding) }));
  }
}
