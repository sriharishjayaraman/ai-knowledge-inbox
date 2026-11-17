import * as cheerio from "cheerio";
import { AppError } from "../http/errors.js";

export interface FetchedPage {
  title: string | null;
  text: string;
}

const TIMEOUT_MS = 10_000;
const MAX_CHARS = 3_000_000;
const NOISE = "script, style, noscript, svg, iframe, nav, header, footer, aside, form, button";
const BLOCKS = "p, h1, h2, h3, h4, h5, h6, li, pre, blockquote, tr, div, section, article";

export async function fetchPage(url: string): Promise<FetchedPage> {
  let res: Response;
  try {
    res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "user-agent": "AI-Knowledge-Inbox/1.0", accept: "text/html, text/plain;q=0.9" },
    });
  } catch (err) {
    const reason = (err as Error).name === "TimeoutError" ? `timed out after ${TIMEOUT_MS / 1000}s` : (err as Error).message;
    throw new AppError("URL_FETCH_FAILED", `Could not fetch ${url}: ${reason}`);
  }
  if (!res.ok) throw new AppError("URL_FETCH_FAILED", `Fetching ${url} returned HTTP ${res.status}`);

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.startsWith("text/")) {
    throw new AppError("UNSUPPORTED_CONTENT_TYPE", `Only HTML and plain-text pages are supported (got "${contentType || "unknown"}")`);
  }

  const body = await res.text();
  if (body.length > MAX_CHARS) throw new AppError("URL_TOO_LARGE", "Page is larger than 3MB");

  const page = contentType.includes("text/html") ? extractFromHtml(body) : { title: null, text: body };
  if (!page.text.trim()) throw new AppError("URL_NO_TEXT", `No readable text found at ${url}`);
  return page;
}

function extractFromHtml(html: string): FetchedPage {
  const $ = cheerio.load(html);
  const title = ($('meta[property="og:title"]').attr("content") || $("title").first().text()).trim() || null;

  $(NOISE).remove();
  $("br").replaceWith("\n");
  const root = [$("article"), $("main"), $("body")].find((el) => el.length)!.first();
  root.find(BLOCKS).each((_, el) => {
    $(el).append("\n\n");
  });

  const text = root
    .text()
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { title, text };
}
