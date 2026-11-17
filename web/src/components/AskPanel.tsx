import { ArrowUp, Lightbulb, ListChecks, ScrollText, Search } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useConversation } from "../hooks/useConversation";
import { cx } from "../lib/cx";
import { Answer } from "./Answer";
import { Alert, Mark } from "./ui";

const SUGGESTIONS = [
  { Icon: ScrollText, title: "Summarize my inbox", text: "Summarize the main points across everything I've saved." },
  { Icon: Lightbulb, title: "Find the key ideas", text: "What ideas come up more than once in what I've saved?" },
  { Icon: ListChecks, title: "Pull out action items", text: "List anything in my notes that reads like a to-do." },
  { Icon: Search, title: "What's the most recent thing I saved?", text: "What is the most recent thing I saved about?" },
];

export function AskPanel({ canAsk }: { canAsk: boolean }) {
  const { turns, ask, pending } = useConversation();
  const [draft, setDraft] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const ready = canAsk && !pending && draft.trim().length >= 3;

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [turns]);

  const send = (text: string) => {
    if (!canAsk || pending) return;
    void ask(text);
    setDraft("");
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (ready) send(draft.trim());
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
      {turns.length === 0 ? (
        <div className="my-auto flex flex-col gap-7 py-12">
          <div className="flex flex-col items-start gap-4">
            <Mark size={56} />
            <div>
              <h1 className="text-[28px] leading-tight font-semibold tracking-tight sm:text-[32px]">What do you want to know?</h1>
              <p className="mt-1.5 max-w-lg text-md text-ink-2">
                {canAsk
                  ? "Ask in your own words. Every answer points back to the notes and pages it came from."
                  : "Save a note or a link on the left. Once it shows Ready, ask about it here."}
              </p>
            </div>
          </div>
          {canAsk && (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {SUGGESTIONS.map(({ Icon, title, text }) => (
                <button
                  key={title}
                  type="button"
                  onClick={() => send(text)}
                  className="group flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5 text-left transition hover:-translate-y-px hover:border-line-strong hover:shadow-card"
                >
                  <span className="grid size-9 flex-none place-items-center rounded-xl bg-brand-soft text-brand transition group-hover:bg-brand group-hover:text-white">
                    <Icon className="size-[17px]" />
                  </span>
                  <span className="text-sm font-semibold">{title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6 py-8" aria-live="polite">
          {turns.map((turn) => (
            <div key={turn.id} className="flex flex-col gap-5">
              <p className="max-w-[80%] self-end rounded-[20px] rounded-br-md bg-brand-soft px-4 py-2.5 text-md leading-relaxed">
                {turn.question}
              </p>
              {turn.status === "pending" && <Thinking />}
              {turn.status === "done" && <Answer result={turn.result} />}
              {turn.status === "error" && <Alert>{turn.message}</Alert>}
            </div>
          ))}
          <div ref={end} />
        </div>
      )}

      <div className="sticky bottom-0 mt-auto bg-gradient-to-t from-canvas from-70% to-transparent pt-6 pb-6">
        <form
          onSubmit={submit}
          className="overflow-hidden rounded-[22px] border border-line-strong/70 bg-surface shadow-card transition focus-within:border-brand/45"
        >
          <textarea
            rows={2}
            value={draft}
            disabled={!canAsk}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder={canAsk ? "Ask anything about what you've saved…" : "Save something first…"}
            aria-label="Ask your inbox"
            className="block w-full resize-none bg-transparent px-4 pt-3.5 text-md leading-relaxed placeholder:text-ink-3 focus:outline-none disabled:cursor-not-allowed"
          />
          <div className="flex items-center justify-between gap-3 px-3 pb-3 pl-4">
            <span className="text-2xs text-ink-3">
              <kbd className="font-sans font-semibold text-ink-2">Enter</kbd> to send ·{" "}
              <kbd className="font-sans font-semibold text-ink-2">Shift + Enter</kbd> for a new line
            </span>
            <button
              type="submit"
              aria-label="Send"
              disabled={!ready}
              className={cx(
                "grid size-9 flex-none place-items-center rounded-full transition",
                ready ? "bg-brand text-white hover:bg-brand-strong" : "bg-surface-2 text-ink-3",
              )}
            >
              <ArrowUp className="size-[17px]" strokeWidth={2} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Thinking() {
  return (
    <div className="flex items-center gap-3" role="status">
      <Mark />
      <span className="sr-only">Searching your inbox</span>
      <span aria-hidden="true" className="flex gap-1">
        {[0, 150, 300].map((delay) => (
          <span key={delay} className="size-1.5 animate-bounce rounded-full bg-ink-3" style={{ animationDelay: `${delay}ms` }} />
        ))}
      </span>
    </div>
  );
}
