export interface ChunkOptions {
  maxChars: number;
  overlapChars: number;
}

// ~1000 chars is roughly 200-250 tokens: small enough to stay on one topic,
// big enough to keep a paragraph's meaning intact.
export const DEFAULT_CHUNK_OPTIONS: ChunkOptions = { maxChars: 1000, overlapChars: 150 };

const SENTENCE_BOUNDARY = /(?<=[.!?])\s+/;

export function chunkText(text: string, opts: ChunkOptions = DEFAULT_CHUNK_OPTIONS): string[] {
  const units = splitIntoUnits(normalizeWhitespace(text), opts.maxChars);
  const chunks: string[] = [];
  let current: string[] = [];

  for (const unit of units) {
    if (current.length > 0 && joinedLength([...current, unit]) > opts.maxChars) {
      chunks.push(current.join("\n"));
      current = overlapTail(current, opts.overlapChars);
      if (joinedLength([...current, unit]) > opts.maxChars) current = [];
    }
    current.push(unit);
  }
  if (current.length > 0) chunks.push(current.join("\n"));
  return chunks;
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Paragraphs first; fall back to sentences, then to hard word-boundary cuts.
function splitIntoUnits(text: string, maxChars: number): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean)
    .flatMap((p) => (p.length <= maxChars ? [p] : p.split(SENTENCE_BOUNDARY)))
    .flatMap((s) => (s.length <= maxChars ? [s] : hardSplit(s, maxChars)));
}

function hardSplit(text: string, maxChars: number): string[] {
  const parts: string[] = [];
  let rest = text;
  while (rest.length > maxChars) {
    const cut = rest.lastIndexOf(" ", maxChars);
    const at = cut > maxChars / 2 ? cut : maxChars;
    parts.push(rest.slice(0, at).trim());
    rest = rest.slice(at).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}

function overlapTail(units: string[], overlapChars: number): string[] {
  const tail: string[] = [];
  for (let i = units.length - 1; i >= 0; i--) {
    if (joinedLength([units[i], ...tail]) > overlapChars) break;
    tail.unshift(units[i]);
  }
  return tail;
}

function joinedLength(units: string[]): number {
  return units.reduce((n, u) => n + u.length, 0) + Math.max(0, units.length - 1);
}
