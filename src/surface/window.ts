// A long list keeps the chosen row in view and says how much is left, the same on every surface.
import type { Stack } from "./contract.ts";

/** What cannot be missing: a defect fails here, out loud, and never turns into some other screen. */
export function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("a required value is missing");
  return value;
}
/** Where something is, or the top when nothing matches. */
export const foundAt = <T>(all: readonly T[], test: (item: T) => boolean): number => Math.max(all.findIndex(test), 0);
const rowsOf = (stacks: readonly Stack[]): number => stacks.reduce((sum, stack) => sum + stack.rows.length, 0);
const linesOf = (stack: Stack): number => 1 + Math.max(stack.rows.length, 1);

/** The one list that holds the chosen row, cut around it: when it alone is taller than the room. */
function cut(stacks: readonly Stack[], at: number, room: number): readonly Stack[] {
  const stack = must(stacks[at]);
  const fits = Math.max(room - 3, 1);
  const chosen = foundAt(stack.rows, row => !!row.selected);
  const start = Math.max(Math.min(chosen - Math.floor(fits / 2), stack.rows.length - fits), 0);
  const end = start + fits;
  return [
    {
      ...stack,
      rows: stack.rows.slice(start, end),
      above: rowsOf(stacks.slice(0, at)) + start,
      below: rowsOf(stacks.slice(at + 1)) + Math.max(stack.rows.length - end, 0),
    },
  ];
}
/** What does not fit keeps the list with the chosen row, and around it every list that still fits whole: first the
 * ones above, then the ones below. What is left out is counted, above and below. */
export function windowed(stacks: readonly Stack[], room: number): readonly Stack[] {
  const lines = stacks.reduce((sum, stack, i) => sum + linesOf(stack) + (i ? 1 : 0), 0);
  if (lines <= room) return stacks;
  const at = foundAt(stacks, stack => stack.rows.some(row => row.selected));
  const cost = (index: number): number => linesOf(must(stacks[index])) + 1;
  /** Two lines go to saying how much is left out. */
  const budget = room - 2;
  if (cost(at) > budget) return cut(stacks, at, room);
  let [from, to, used] = [at, at, cost(at)];
  while (from > 0 && used + cost(from - 1) <= budget) used += cost(--from);
  while (to < stacks.length - 1 && used + cost(to + 1) <= budget) used += cost(++to);
  const shown = stacks.slice(from, to + 1);
  const above = rowsOf(stacks.slice(0, from));
  const below = rowsOf(stacks.slice(to + 1));
  return shown.map((stack, i) => ({
    ...stack,
    ...(i === 0 && above ? { above } : {}),
    ...(i === shown.length - 1 && below ? { below } : {}),
  }));
}
