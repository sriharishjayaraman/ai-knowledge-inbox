import { describe, expect, it } from "vitest";
import { chunkText } from "./chunker.js";

describe("chunkText", () => {
  it("keeps short text as a single chunk", () => {
    expect(chunkText("Hello world.\n\nSecond paragraph.")).toEqual(["Hello world.\nSecond paragraph."]);
  });

  it("never exceeds maxChars and carries overlap between chunks", () => {
    const paragraphs = Array.from({ length: 12 }, (_, i) => `Paragraph ${i} `.repeat(8).trim());
    const chunks = chunkText(paragraphs.join("\n\n"), { maxChars: 300, overlapChars: 120 });

    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(300);
    const lastOfFirst = chunks[0].split("\n").at(-1)!;
    expect(chunks[1].startsWith(lastOfFirst)).toBe(true);
  });

  it("splits a giant unbroken paragraph on word boundaries", () => {
    const chunks = chunkText("word ".repeat(1000), { maxChars: 200, overlapChars: 0 });
    for (const c of chunks) {
      expect(c.length).toBeLessThanOrEqual(200);
      expect(c).not.toMatch(/^\S*wor$|^ord/);
    }
  });

  it("returns nothing for blank input", () => {
    expect(chunkText("   \n\n  ")).toEqual([]);
  });
});
