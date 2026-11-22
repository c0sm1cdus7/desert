// Cuts recoverable units of the frame, counting them per section, and refuses a minimum over the explicit bound.
import type { Language } from "../../fields/languages.ts";
import { renderMindFrame } from "./mind-frame-text.ts";
import type { FrameItem, FrameSnapshot, MindFrame } from "./mind-frame.ts";
export type InputBound = (frame: MindFrame) => number;
export type FrameLimits = Readonly<{ max: number; bound: InputBound }>;
export type FitResult =
  Readonly<{ tooLarge: true }> | Readonly<{ tooLarge: false; frame: MindFrame; omitted: readonly string[] }>;
export function fitMindFrame(snapshot: FrameSnapshot, language: Language, limits: FrameLimits): FitResult {
  if (!Number.isSafeInteger(limits.max) || limits.max < 0 || typeof limits.bound !== "function")
    throw new Error("Límite de marco inválido");
  const seen = new Set<string>();
  let activity = snapshot.activity.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
  let objects = [...snapshot.objects];
  let thread = [...snapshot.thread];
  const omitted: string[] = [];
  const counts = { activity: 0, objects: 0, thread: 0 };
  const frame = () => renderMindFrame({ ...snapshot, activity, objects, thread }, language, counts);
  const fits = (value: MindFrame) => {
    const size = limits.bound(value);
    if (!Number.isSafeInteger(size) || size < 0) throw new Error("Cota de entrada inválida");
    return size <= limits.max;
  };
  let current = frame();
  const remove = (items: readonly FrameItem[], index: number, section: keyof typeof counts) => {
    const item = items[index];
    if (item === undefined) throw new Error("Elemento de marco ausente");
    omitted.push(item.id);
    counts[section] += 1;
    return items.filter((_, i) => i !== index);
  };
  while (!fits(current)) {
    const index = activity.findIndex(item => item.covered);
    if (index >= 0) activity = remove(activity, index, "activity");
    else if (objects.length) objects = [...remove(objects, 0, "objects")];
    else if (thread.length) thread = [...remove(thread, 0, "thread")];
    else return { tooLarge: true };
    current = frame();
  }
  return { tooLarge: false, frame: current, omitted };
}
