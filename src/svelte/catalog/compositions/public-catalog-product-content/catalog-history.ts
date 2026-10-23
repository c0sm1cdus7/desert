/** Browser history stores navigation only, never drafts or file references. */
type Entry<T> = { id: string; depth: number; snapshot: T };
export function catalogHistory<T>(read: () => T, restore: (value: T) => Promise<void>,
  route: (value: T) => string) {
  let current: Entry<T> = { id: crypto.randomUUID(), depth: 0, snapshot: read() };
  const memory = new Map<string, T>();
  const key = 'desert.catalog.navigation';
  const save = () => {
    current.snapshot = read();
    memory.set(current.id, current.snapshot);
    history.replaceState({ ...history.state, [key]: current }, '', route(current.snapshot));
  };
  // A reload begins a new navigation session. Drafts intentionally do not survive.
  save();
  const previousRestoration = history.scrollRestoration;
  history.scrollRestoration = 'manual';
  const pop = (event: PopStateEvent) => {
    const entry = event.state?.[key] as Entry<T> | undefined;
    if (!entry || typeof entry.id !== 'string') return;
    memory.set(current.id, read());
    current = entry;
    void restore(memory.get(entry.id) ?? entry.snapshot);
  };
  window.addEventListener('popstate', pop);
  return {
    capture: save,
    push() {
      current = { id: crypto.randomUUID(), depth: current.depth + 1, snapshot: read() };
      memory.set(current.id, current.snapshot);
      history.pushState({ ...history.state, [key]: current }, '', route(current.snapshot));
    },
    back() {
      if (!current.depth) return false;
      history.back();
      return true;
    },
    dispose() {
      window.removeEventListener('popstate', pop);
      history.scrollRestoration = previousRestoration;
    },
  };
}
