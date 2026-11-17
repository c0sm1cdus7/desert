// Compacta proyecciones de hilos sin borrar sus referencias ni las llegadas posteriores al corte.
export type ThreadEntry = Readonly<{ seq: number; id: string; text: string }>;
export type ThreadCompaction = Readonly<{ through: number; keep: readonly string[]; omitted: readonly string[] }>;
export type MindThread = Readonly<{ entries: readonly ThreadEntry[]; compacted: readonly ThreadCompaction[] }>;
export function threadStep(
  thread: MindThread,
  request: Readonly<{ through: number; keep: readonly string[] }>,
): MindThread {
  if (!Number.isSafeInteger(request.through) || request.through < 0) throw new Error("Compactación de hilo inválida");
  const covered = thread.entries.filter(entry => entry.seq <= request.through);
  const ids = new Set(covered.map(entry => entry.id));
  if (new Set(request.keep).size !== request.keep.length || request.keep.some(id => !ids.has(id)))
    throw new Error("Referencias de hilo inválidas");
  const keep = new Set(request.keep);
  const omitted = covered.filter(entry => !keep.has(entry.id)).map(entry => entry.id);
  return {
    entries: thread.entries.filter(entry => entry.seq > request.through || keep.has(entry.id)),
    compacted: [...thread.compacted, { through: request.through, keep: [...request.keep], omitted }],
  };
}
export function threadWindow(thread: MindThread): readonly ThreadEntry[] {
  return thread.entries;
}

export type ThreadKey = Readonly<{ actor: string; process?: string }>;
export type ThreadBank = ReadonlyMap<string, MindThread>;
export function threadKey(key: ThreadKey): string {
  if (!key.actor || key.process === "") throw new Error("Identidad de hilo inválida");
  return JSON.stringify([key.actor, key.process ?? null]);
}
export function threadFor(bank: ThreadBank, key: ThreadKey): MindThread {
  const thread = bank.get(threadKey(key));
  if (!thread) throw new Error("Hilo ausente");
  return thread;
}
export function putThread(bank: ThreadBank, key: ThreadKey, thread: MindThread): ThreadBank {
  return new Map(bank).set(threadKey(key), thread);
}
export function appendThread(thread: MindThread, entry: ThreadEntry): MindThread {
  if (
    !Number.isSafeInteger(entry.seq) ||
    entry.seq < 0 ||
    !entry.id ||
    thread.entries.some(item => item.id === entry.id) ||
    thread.compacted.some(item => item.omitted.includes(entry.id))
  )
    throw new Error("Entrada de hilo inválida");
  return { ...thread, entries: [...thread.entries, entry] };
}
