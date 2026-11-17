export type SourceType = "note" | "url";
export type ItemStatus = "processing" | "ready" | "failed";

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

export type IngestRequest = { type: "note"; text: string } | { type: "url"; url: string };

export interface QuerySource {
  ref: number;
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, { ...init, headers: { "content-type": "application/json" } });
  } catch {
    throw new Error("Can't reach the server. Is it running?");
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error?.message ?? `Request failed with HTTP ${res.status}`);
  return body as T;
}

const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

export const api = {
  listItems: () => request<{ items: Item[] }>("/items").then((r) => r.items),
  ingest: (body: IngestRequest) => request<{ item: Item }>("/ingest", post(body)).then((r) => r.item),
  query: (question: string) => request<QueryResult>("/query", post({ question })),
};
