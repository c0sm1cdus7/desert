// A list that does not fit the room it has: what stays in view around the chosen row, and what is counted as left out.
import { describe, expect, it } from "vitest";
import type { Stack } from "../contract/contract.ts";
import { fitted, windowed } from "./window.ts";

const rows = (count: number, selected?: number) =>
  Array.from({ length: count }, (_, index) => ({
    title: `r${index}`,
    ...(index === selected ? { selected: true } : {}),
  }));
const stacks: Stack[] = [
  { title: "data", rows: rows(6) },
  { title: "lines", rows: rows(2) },
  { title: "actions", rows: rows(4, 2) },
];
const seen = (shown: readonly Stack[]) =>
  shown.map(stack => [stack.title, stack.rows.length, stack.above, stack.below]);

describe("a list in the room it has", () => {
  it("is whole when it fits", () => {
    expect(windowed(stacks, 17)).toBe(stacks);
  });

  it("keeps the list with the chosen row and every list above it that still fits whole, counting the rest", () => {
    expect(seen(windowed(stacks, 13))).toEqual([
      ["lines", 2, 6, undefined],
      ["actions", 4, undefined, undefined],
    ]);
  });

  it("takes the lists below when the chosen row is at the top", () => {
    const top: Stack[] = [{ title: "actions", rows: rows(4, 0) }, ...stacks.slice(0, 2)];
    expect(seen(windowed(top, 13))).toEqual([["actions", 4, undefined, 8]]);
    expect(seen(windowed(top, 16))).toEqual([
      ["actions", 4, undefined, undefined],
      ["data", 6, undefined, 2],
    ]);
  });

  it("cuts the list with the chosen row around it when that list alone is taller than the room", () => {
    const tall: Stack[] = [
      { title: "data", rows: rows(2) },
      { title: "many", rows: rows(30, 20) },
    ];
    const [only] = windowed(tall, 10);
    expect([only?.title, only?.rows.length, only?.above, only?.below]).toEqual(["many", 7, 19, 6]);
    expect(only?.rows.some(row => row.selected)).toBe(true);
  });
});

describe("the options of a question in the room they have", () => {
  const seenOptions = (count: number, at: number, room: number, typed = false) => {
    const all = [...(typed ? [{ title: "", entry: { typed: "", caret: 0 } }] : []), ...rows(count, at)];
    const { options, more } = fitted(all, room);
    return [options.map(option => option.title).join(" "), more];
  };
  it("are whole when they fit, with nothing counted as left out", () => {
    expect(seenOptions(3, 0, 5)).toEqual(["r0 r1 r2", undefined]);
  });
  it("keep the chosen one in view and count what is left out above and below", () => {
    expect(seenOptions(40, 0, 6)).toEqual(["r0 r1 r2 r3", { above: 0, below: 36 }]);
    expect(seenOptions(40, 20, 6)).toEqual(["r18 r19 r20 r21", { above: 18, below: 18 }]);
    expect(seenOptions(40, 39, 6)).toEqual(["r36 r37 r38 r39", { above: 36, below: 0 }]);
  });
  it("keep first the row that is written in, whatever is chosen below it", () => {
    expect(seenOptions(40, 30, 6, true)).toEqual([" r29 r30 r31", { above: 29, below: 8 }]);
  });
});
