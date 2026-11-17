import { Fragment } from "react";
import type { QueryResult } from "../api/client";
import { hostOf } from "../lib/format";
import { Mark } from "./ui";

export function Answer({ result }: { result: QueryResult }) {
  const cited = result.sources.filter((s) => s.cited);
  const refs = new Set(cited.map((s) => String(s.ref)));

  return (
    <div className="flex items-start gap-3">
      <Mark />
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <p className="pt-0.5 text-md leading-relaxed whitespace-pre-line">
          {result.answer.split(/(\[\d+\])/g).map((part, i) => {
            const ref = part.match(/^\[(\d+)\]$/)?.[1];
            if (!ref || !refs.has(ref)) return <Fragment key={i}>{part}</Fragment>;
            return (
              <span
                key={i}
                className="mx-0.5 inline-grid size-[18px] place-items-center rounded-md bg-brand-soft align-middle font-mono text-2xs font-semibold text-brand"
              >
                {ref}
              </span>
            );
          })}
        </p>

        {!result.grounded && result.sources.length > 0 && (
          <p className="rounded-xl bg-accent-soft px-3.5 py-2 text-compact text-accent-ink">
            This answer doesn't cite your saved items, so double-check it.
          </p>
        )}

        {cited.length > 0 && (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {cited.map((s) => (
              <div key={s.chunkId} className="flex flex-col gap-1.5 rounded-2xl border border-line bg-surface px-4 py-3">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <span className="grid size-5 flex-none place-items-center rounded-md bg-brand font-mono text-2xs text-white">
                    {s.ref}
                  </span>
                  <span className="truncate" title={s.title}>
                    {s.title}
                  </span>
                </p>
                <p className="line-clamp-3 text-compact leading-snug text-ink-2">{s.snippet}</p>
                {s.url && (
                  <a href={s.url} target="_blank" rel="noreferrer" className="w-fit text-xs font-medium text-brand hover:underline">
                    {hostOf(s.url)} ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
