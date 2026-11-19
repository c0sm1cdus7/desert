// Recorta unidades recuperables del marco y rechaza un mínimo que supera la cota explícita.
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
  const frame = () => renderMindFrame({ ...snapshot, activity, objects, thread }, language, omitted);
  const fits = (value: MindFrame) => {
    const size = limits.bound(value);
    if (!Number.isSafeInteger(size) || size < 0) throw new Error("Cota de entrada inválida");
    return size <= limits.max;
  };
  let current = frame();
  const remove = (items: readonly FrameItem[], index: number) => {
    const item = items[index];
    if (item === undefined) throw new Error("Elemento de marco ausente");
    omitted.push(item.id);
    return items.filter((_, i) => i !== index);
  };
  while (!fits(current)) {
    const index = activity.findIndex(item => item.covered);
    if (index >= 0) activity = remove(activity, index);
    else if (objects.length) objects = [...remove(objects, 0)];
    else if (thread.length) thread = [...remove(thread, 0)];
    else return { tooLarge: true };
    current = frame();
  }
  return { tooLarge: false, frame: current, omitted };
}
