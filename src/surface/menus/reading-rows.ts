// Lee filas sin seleccionar las apagadas, conservando la navegación breve de los grupos chicos.
import type { Picture } from "../session/screen.ts";
import type { Tool } from "../contract/shown-tool.ts";
import { choices, cursorOf, stacksOf } from "./lists.ts";
export const readingAt = (at: number, length: number, way: "up" | "down"): number =>
  Math.max(0, Math.min(at + (way === "up" ? -1 : 1), Math.max(length - 1, 0)));
/** One- and two-row stacks fit even in five content lines: keep their established one-arrow navigation. */
function nextReading(lengths: readonly number[], at: number, way: "up" | "down"): number {
  const total = lengths.reduce((sum, length) => sum + length, 0);
  const before = (index: number) => lengths.slice(0, index).reduce((sum, length) => sum + length, 0);
  /** The list the cursor is in: the first one whose rows reach it. */
  const stack = lengths.findIndex((length, index) => at < before(index) + length);
  const size = lengths[stack] ?? 1;
  const next = way === "down" && size <= 2 ? before(stack) + size : readingAt(at, total, way);
  const bounded = Math.min(next, total - 1);
  const there = lengths.findIndex((length, index) => bounded < before(index) + length);
  return (lengths[there] ?? 1) <= 2 ? before(there) : bounded;
}
/** At a cursor edge, arrows read row by row through long stacks. Short stacks keep one-arrow navigation.
 * Reading never moves the cursor onto a disabled row. */
export function movedList(place: Picture, tools: readonly Tool[], way: "up" | "down"): Picture {
  const cursor = cursorOf(place, tools);
  const selected = choices(place, tools);
  const next = readingAt(cursor, selected.length, way);
  const { reading, shift: _shift, ...plain } = place;
  if (reading === undefined && next !== cursor) return { ...plain, at: next };
  const stacks = stacksOf(place, tools);
  const rows = stacks.flatMap(stack => (stack.rows.length ? stack.rows : [{ title: "" }]));
  let selectable = -1;
  const home = rows.findIndex(row => (row.open || row.press) && ++selectable === cursor);
  const lengths = stacks.map(stack => Math.max(stack.rows.length, 1));
  return { ...plain, reading: nextReading(lengths, reading ?? Math.max(home, 0), way) };
}
/** The option above or below that can be chosen: the cursor never rests on one that cannot. */
export function movedOptions(
  options: readonly { off?: boolean }[],
  at: number,
  way: "up" | "down",
  reading?: number,
): Readonly<{ at: number; reading?: number }> {
  if (reading !== undefined) return { at, reading: readingAt(reading, options.length, way) };
  const step = way === "up" ? -1 : 1;
  for (let next = at + step; next >= 0 && next < options.length; next += step)
    if (!options[next]?.off) return { at: next };
  return { at, reading: readingAt(Math.max(at, 0), options.length, way) };
}
