import type { StoredChunk } from "../db/chunksRepo.js";

export interface ScoredChunk extends StoredChunk {
  score: number;
}

// Brute-force cosine over unit vectors (dot product). Fine for thousands of chunks; see README for scale notes.
export function topKBySimilarity(query: Float32Array, candidates: StoredChunk[], k: number, minScore: number): ScoredChunk[] {
  return candidates
    .map((c) => ({ ...c, score: dot(query, c.embedding) }))
    .filter((c) => c.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

export function dot(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) throw new Error(`Embedding size mismatch: ${a.length} vs ${b.length}. Re-index after changing models.`);
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}
