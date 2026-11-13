// A long list keeps the chosen row in view and says how much is left, the same on every surface.
import type { Stack } from "./contract.ts";
/** What cannot be missing: a defect fails here, out loud, and never turns into some other screen. */
export function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("a required value is missing");
  return value;
}
export const foundAt = <T>(all: readonly T[], test: (item: T) => boolean): number => Math.max(all.findIndex(test), 0);
/** How much of some lists a person would read: every row, and for a list with none, the line that says so. */
const rowsOf = (stacks: readonly Stack[]): number =>
  stacks.reduce((sum, stack) => sum + Math.max(stack.rows.length, 1), 0);
const linesOf = (stack: Stack): number => 1 + Math.max(stack.rows.length, 1);
function cut(stacks: readonly Stack[], at: number, room: number, reading?: number): readonly Stack[] {
  const stack = must(stacks[at]);
  const fits = Math.max(room - 3, 1);
  const chosen = reading ?? foundAt(stack.rows, row => !!row.selected);
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
/** Keep the read or selected stack and its neighbors, counting omitted rows above and below. */
export function windowed(stacks: readonly Stack[], room: number, shift = 0, reading?: number): readonly Stack[] {
  const lines = stacks.reduce((sum, stack, i) => sum + linesOf(stack) + (i ? 1 : 0), 0);
  if (lines <= room) return stacks;
  const before = (index: number) => rowsOf(stacks.slice(0, index));
  const chosen =
    reading === undefined
      ? foundAt(stacks, stack => stack.rows.some(row => row.selected))
      : foundAt(stacks, stack => reading < before(stacks.indexOf(stack)) + Math.max(stack.rows.length, 1));
  const at = Math.min(Math.max(chosen + shift, 0), stacks.length - 1);
  const cost = (index: number): number => linesOf(must(stacks[index])) + 1;
  /** Two lines go to saying how much is left out. */
  const budget = room - 2;
  if (cost(at) > budget) return cut(stacks, at, room, reading === undefined ? undefined : reading - before(at));
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
/** Keep the focused option visible, pin the entry, and reserve two lines for omitted counts. */
type WindowRow = { selected?: boolean; entry?: unknown };
export function fitted<T extends WindowRow>(all: readonly T[], room: number, reading?: number) {
  const pinned = all[0]?.entry === undefined ? [] : all.slice(0, 1);
  const options = all.slice(pinned.length);
  if (all.length <= room) return { options: all };
  const fits = Math.max(room - pinned.length - 2, 1);
  const chosen = reading ?? foundAt(options, option => !!option.selected);
  const start = Math.max(Math.min(chosen - Math.floor(fits / 2), options.length - fits), 0);
  const more = { above: start, below: Math.max(options.length - start - fits, 0) };
  return { options: [...pinned, ...options.slice(start, start + fits)], more };
}
