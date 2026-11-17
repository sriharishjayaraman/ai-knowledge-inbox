# AI Knowledge Inbox

A small app where you save notes and links, then ask questions about them. The answers come only
from what you saved, and every answer shows which saved item it came from.

It uses RAG (retrieval-augmented generation): find the saved text that matches the question, then
ask an AI model to answer using only that text.

**Stack:** React + Vite + Tailwind on the front end, Node 22 + Express + TypeScript on the back end,
SQLite for storage, and Google Gemini for the AI parts.

## Run it

You need Node 22 and a free Gemini API key from https://aistudio.google.com/apikey.

```bash
npm install
cp server/.env.example server/.env   # paste your key into GEMINI_API_KEY
npm run dev
```

Then open http://localhost:5173. The API runs on port 3001.

Other commands:

- `npm test` runs the server tests. They use fake AI providers, so no key is needed.
- `npm run typecheck` checks types.
- `npm run build` makes a production build.

## Try it

1. Save a note, for example a few lines about a trip with dates and places.
2. Save a link, for example a Wikipedia page.
3. Ask a question the note answers. The answer has a citation like [1] that points to the note.
4. Ask the same thing in different words. It still finds it, because search works on meaning, not
   exact words.
5. Ask something you never saved. It says it found nothing, and the AI model is not called at all.

## How it works

There are two flows: saving something, and asking a question.

**Saving (`POST /ingest`)**

1. Check the input.
2. If it is a link, download the page and pull out the readable text. A dead link fails right away
   with a clear error.
3. Save the item and reply straight away with status `processing`.
4. In the background: split the text into chunks, turn each chunk into a vector (a list of numbers
   that captures its meaning) with Gemini, and store the vectors. The item becomes `ready`, or
   `failed` with a reason.

The UI checks the item list every 1.5 seconds, but only while something is still processing.

**Asking (`POST /query`)**

1. Turn the question into a vector the same way.
2. Compare it with every saved chunk and keep the 5 closest ones above a minimum score.
3. If nothing is close enough, say so and stop. No AI call is made.
4. Otherwise, send the question plus the numbered chunks to Gemini, with an instruction to answer
   only from them and cite them as [1], [2] and so on.
5. Return the answer with the sources it cited.

### Where things live

| What | Files (in `server/src`) |
| --- | --- |
| HTTP layer | `app.ts`, `routes/index.ts`, `routes/schemas.ts`, `http/errors.ts` |
| Saving | `ingest/ingestService.ts`, `ingest/chunker.ts`, `ingest/urlFetcher.ts` |
| Asking | `query/queryService.ts`, `query/retriever.ts`, `query/prompt.ts` |
| AI | `ai/types.ts` (interfaces), `ai/gemini.ts` (the only file that talks to Gemini) |
| Storage | `db/database.ts`, `db/itemsRepo.ts`, `db/chunksRepo.ts` |
| Startup | `index.ts` creates everything and passes it in, so tests can swap in fakes |

The front end is in `web/src`: `components/` for the UI, `hooks/` for data loading, and
`api/client.ts` for calls to the server.

## API

Every error has the same shape, and every response has an `x-request-id` header that also appears in
the logs:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [], "requestId": "..." } }
```

### `POST /ingest`: save a note or a link

```json
{ "type": "note", "text": "Pizza was invented in Naples.", "title": "optional" }
{ "type": "url", "url": "https://example.com/post", "title": "optional" }
```

Returns `202 Accepted` with the new item, which starts as `processing`.

| Status | Meaning |
| --- | --- |
| 400 | Bad input: empty text, invalid URL, wrong type, or broken JSON |
| 413 | Request body over 100 KB |
| 422 | The link could not be turned into text (dead, not HTML or text, too large, or empty) |

### `GET /items`: list everything saved

Returns `200` with `{ "items": [...] }`, newest first. Each item has a `status` of `processing`,
`ready` or `failed`.

### `POST /query`: ask a question

```json
{ "question": "Where does pizza come from?" }
```

Returns `200`:

```json
{
  "answer": "Pizza was invented in Naples [1].",
  "grounded": true,
  "sources": [
    { "ref": 1, "title": "...", "sourceType": "note", "snippet": "...", "score": 0.71, "cited": true }
  ]
}
```

`grounded` is false when nothing relevant was found, or when the model did not cite anything. If a
Gemini call fails, you get `502`, or `503` when rate limited.

## Design decisions

### Chunking

Text is split into chunks of about 1000 characters, with about 150 characters of overlap between
neighbours.

- It splits on paragraphs first, because one paragraph is usually one idea. Short paragraphs are
  joined together, so a short note stays as a single chunk.
- A paragraph that is too long is split by sentence, and a very long sentence by word. Nothing is
  cut in the middle of a word.
- The overlap means a fact sitting on the border between two chunks can still be found.
- 1000 characters is small enough to keep each chunk on one topic (which makes search more
  accurate) and big enough to give the model useful context.

Not done yet: splitting long web pages by their headings. That would be the next step if answers
from long articles are weak.

### Vector store

Vectors are stored in SQLite, next to the text they belong to. Search is a simple loop that compares
the question with every chunk. There is no LangChain and no separate vector database.

- One file, no extra services, and it survives restarts.
- Each chunk's vector is 3 KB (768 numbers). 10,000 chunks is about 30 MB and searching them takes
  a few milliseconds, which is plenty for one person's inbox.
- Gemini gets told whether it is embedding a document or a question. It is trained to match the two,
  so this improves results.

### Models

- `gemini-embedding-001` turns text into vectors (used when saving and when asking).
- `gemini-3.8-flash` writes the answer (used only when asking, and only if something relevant was
  found).

## What breaks at scale

- **Search checks every chunk.** It gets slow past roughly 100,000 chunks.
- **Background work lives in memory.** If the server crashes mid-indexing, that work is lost (those
  items are marked `failed` on restart). Nothing retries and there is no limit on how much runs at
  once.
- **Rate limits.** Saving many large pages at once means many Gemini calls. Right now a rate limit
  just returns a 503.
- **SQLite allows one writer** on one machine, so you can't run several servers against it.
- **Link fetching is unprotected.** It will follow a link to an internal address (SSRF), and it can't
  read pages that need JavaScript to show their content.
- **No pagination.** `GET /items` returns everything.
- **No duplicate check.** Saving the same link twice stores it twice.
- **Changing the embedding model** makes old vectors useless, and there is no way to re-index yet.
  If vector sizes don't match, the query fails loudly instead of returning wrong results.

## What I'd change for production

- Move vectors to Postgres with pgvector (or a managed vector database), with an index so search
  doesn't scan every row.
- Use a real job queue (BullMQ or SQS) with retries and a concurrency limit, and push status to the
  UI instead of polling.
- Add login and keep each user's data separate.
- Make link fetching safe: block private IP addresses, limit redirects, and use a headless browser
  for JavaScript-heavy pages.
- Improve search with keyword matching alongside vectors, plus a reranker. Build a small set of test
  questions to measure whether changes actually help.
- Detect duplicates by content hash, and record which model made each vector so it can be re-indexed.
- Stream answers word by word, and add metrics for latency, token usage and search scores.

## Debugging

- Logs are structured JSON (via pino), pretty-printed in the terminal during development.
- Every request is logged with its request id, method, path, status and time taken.
- Saving logs the item id, chunk count and timing. Asking logs how many chunks were searched, how
  many matched, the top score, and the AI call's time and token usage.
- When something fails, the error's `requestId` matches the log line, so you can find exactly what
  happened.
- The config is checked at startup. A missing API key stops the server with a clear message.
