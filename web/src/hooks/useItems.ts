import { useCallback, useEffect, useState } from "react";
import { api, type IngestRequest, type Item } from "../api/client";

const POLL_MS = 1500;

export function useItems() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setItems(await api.listItems());
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Poll only while something is still being embedded.
  const hasProcessing = items.some((i) => i.status === "processing");
  useEffect(() => {
    if (!hasProcessing) return;
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [hasProcessing, refresh]);

  const addItem = useCallback(async (body: IngestRequest) => {
    const item = await api.ingest(body);
    setItems((prev) => [item, ...prev]);
  }, []);

  return { items, loading, error, addItem };
}
