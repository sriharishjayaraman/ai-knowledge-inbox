import { useCallback, useRef, useState } from "react";
import { api, type QueryResult } from "../api/client";

export type Turn =
  | { id: number; question: string; status: "pending" }
  | { id: number; question: string; status: "done"; result: QueryResult }
  | { id: number; question: string; status: "error"; message: string };

// Each question is answered on its own; the thread is only kept for display.
export function useConversation() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const nextId = useRef(0);

  const update = (id: number, next: Turn) => setTurns((all) => all.map((t) => (t.id === id ? next : t)));

  const ask = useCallback(async (question: string) => {
    const id = ++nextId.current;
    setTurns((all) => [...all, { id, question, status: "pending" }]);
    try {
      update(id, { id, question, status: "done", result: await api.query(question) });
    } catch (err) {
      update(id, { id, question, status: "error", message: (err as Error).message });
    }
  }, []);

  const pending = turns.some((t) => t.status === "pending");

  return { turns, ask, pending };
}
