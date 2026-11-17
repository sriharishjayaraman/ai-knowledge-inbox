import { AddItemForm } from "./components/AddItemForm";
import { AskPanel } from "./components/AskPanel";
import { ItemList } from "./components/ItemList";
import { Mark } from "./components/ui";
import { useItems } from "./hooks/useItems";

export default function App() {
  const { items, loading, error, addItem } = useItems();
  const ready = items.filter((i) => i.status === "ready").length;

  return (
    <div className="lg:grid lg:h-screen lg:grid-cols-[400px_minmax(0,1fr)]">
      <aside className="flex flex-col border-b border-line bg-surface lg:min-h-0 lg:border-r lg:border-b-0">
        <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
          <Mark size={28} />
          <div>
            <p className="text-[17px] leading-tight font-bold tracking-tight">Knowledge Inbox</p>
            <p className="text-xs text-ink-3">
              {ready} of {items.length} item{items.length === 1 ? "" : "s"} ready to ask about
            </p>
          </div>
        </div>
        <div className="px-5 pb-5">
          <AddItemForm onAdd={addItem} />
        </div>
        <p className="border-t border-line px-5 pt-4 pb-2 text-2xs font-semibold tracking-wider text-ink-3 uppercase">Library</p>
        <div className="px-2 pb-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
          <ItemList items={items} loading={loading} error={error} />
        </div>
      </aside>

      <main className="flex min-h-[80vh] flex-col px-4 sm:px-8 lg:min-h-0 lg:overflow-y-auto">
        <AskPanel canAsk={ready > 0} />
      </main>
    </div>
  );
}
