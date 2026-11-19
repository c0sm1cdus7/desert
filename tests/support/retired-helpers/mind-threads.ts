// Historical fixtures preserve checks of retired APIs without shipping those APIs in the base.
import {
  type MindThread,
  type ThreadEntry,
  type ThreadKey,
  threadKey,
} from "../../../src/runtime/minds/mind-threads.ts";
type ThreadBank = ReadonlyMap<string, MindThread>;
export function threadWindow(thread: MindThread): readonly ThreadEntry[] {
  return thread.entries;
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
