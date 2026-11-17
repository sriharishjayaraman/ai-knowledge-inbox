import { FileText, Link2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { IngestRequest } from "../api/client";
import { cx } from "../lib/cx";
import { Alert, Button } from "./ui";

type Mode = "note" | "url";

const MODES = [
  { mode: "note", label: "Note", Icon: FileText },
  { mode: "url", label: "Link", Icon: Link2 },
] as const;

const fieldClass =
  "w-full rounded-xl border border-line-strong bg-canvas px-3.5 py-3 text-md placeholder:text-ink-3 transition focus:border-brand/45 focus:bg-surface focus:outline-none";

export function AddItemForm({ onAdd }: { onAdd: (body: IngestRequest) => Promise<void> }) {
  const [mode, setMode] = useState<Mode>("note");
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    const text = value.trim();
    if (!text || pending) return;
    setPending(true);
    setError(null);
    try {
      await onAdd(mode === "note" ? { type: "note", text } : { type: "url", url: text });
      setValue("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
        {MODES.map(({ mode: m, label, Icon }) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            className={cx(
              "flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-sm font-medium transition",
              mode === m ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink",
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {mode === "note" ? (
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void submit();
          }}
          rows={4}
          placeholder="Meeting notes, an idea, a quote worth keeping…"
          className={cx(fieldClass, "resize-none leading-relaxed")}
        />
      ) : (
        <input
          type="url"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://example.com/article"
          className={fieldClass}
        />
      )}

      {error && <Alert>{error}</Alert>}

      <Button type="submit" disabled={pending || !value.trim()}>
        {pending ? (mode === "url" ? "Reading the page…" : "Saving…") : mode === "url" ? "Save link" : "Save note"}
      </Button>
    </form>
  );
}
