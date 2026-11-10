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

export function windowed(stacks: readonly Stack[], room: number): readonly Stack[] {
  const lines = stacks.reduce((sum, stack, i) => sum + linesOf(stack) + (i ? 1 : 0), 0);
  if (lines <= room) return stacks;
  const at = foundAt(stacks, stack => stack.rows.some(row => row.selected));
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
