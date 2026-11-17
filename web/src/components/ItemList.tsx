import { FileText, Globe } from "lucide-react";
import type { Item, ItemStatus } from "../api/client";
import { cx } from "../lib/cx";
import { hostOf, timeAgo } from "../lib/format";
import { Alert } from "./ui";

const STATUS: Record<ItemStatus, { label: string; className: string }> = {
  processing: { label: "Indexing", className: "bg-accent-soft text-accent-ink" },
  ready: { label: "Ready", className: "bg-good-soft text-good" },
  failed: { label: "Failed", className: "bg-danger-soft text-danger" },
};

export function ItemList({ items, loading, error }: { items: Item[]; loading: boolean; error: string | null }) {
  if (loading) return <p className="px-3 py-2 text-sm text-ink-3">Loading…</p>;
  if (error) return <div className="px-3"><Alert>{error}</Alert></div>;
  if (items.length === 0) {
    return <p className="px-3 py-6 text-center text-sm text-ink-3">Nothing saved yet. Your notes and links show up here.</p>;
  }

  return (
    <ul className="flex flex-col">
      {items.map((item) => {
        const Icon = item.sourceType === "url" ? Globe : FileText;
        return (
          <li key={item.id} className="flex gap-3 rounded-xl px-3 py-3 transition hover:bg-canvas">
            <span className="grid size-9 flex-none place-items-center rounded-xl bg-brand-soft text-brand">
              <Icon className="size-[17px]" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="truncate text-sm font-semibold" title={item.title}>
                  {item.title}
                </p>
                <span className={cx("flex-none rounded-full px-2 py-px text-2xs font-semibold", STATUS[item.status].className)}>
                  {STATUS[item.status].label}
                </span>
              </div>
              <p className="flex min-w-0 gap-1.5 text-xs text-ink-3">
                {item.url ? (
                  <a href={item.url} target="_blank" rel="noreferrer" className="truncate font-medium text-brand hover:underline">
                    {hostOf(item.url)}
                  </a>
                ) : (
                  <span>Note</span>
                )}
                <span aria-hidden="true">·</span>
                <span className="flex-none">{timeAgo(item.createdAt)}</span>
              </p>
              <p className={cx("mt-1 line-clamp-2 text-compact leading-snug", item.error ? "text-danger" : "text-ink-2")}>
                {item.error ?? item.preview}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
