// Written entries in threads and rows: text, the unfilled shape, and the cursor.
import type { Body, Row } from "../../surface/contract.ts";
import { put, width, type Grid } from "./cells.ts";

/** A row that is written in: its name when it has one, and what is typed with the caret where it stands. */
export function drawWritten(grid: Grid, r: number, x: number, row: Row & { entry: NonNullable<Row["entry"]> }): void {
  const col = row.title ? put(grid, x, r, { text: row.title, tone: "t2" }) + 2 : x;
  put(grid, col, r, { text: "›", tone: "t2" });
  put(grid, col + 2, r, { text: row.entry.typed, tone: "t1" });
  const under = Array.from(row.entry.typed)[row.entry.caret] ?? " ";
  put(grid, col + 2 + row.entry.caret, r, { text: under, tone: "t1" }, true);
}
export function drawEntry(grid: Grid, body: Extract<Body, { kind: "thread" }>, left: number): void {
  const r = grid.length - 4;
  if (body.reference) put(grid, left, r - 1, { text: body.reference, tone: "t3" });
  if (!body.entry) return;
  const { typed, caret, placeholder, remaining = "", padding = 0, suggested = false } = body.entry;
  put(grid, left, r, { text: "›", tone: "t2" });
  /** What a key would replace is lit whole; what is being written has the caret where it stands. */
  if (typed) put(grid, left + 2, r, { text: typed, tone: "t1" }, suggested);
  else put(grid, left + 3, r, { text: placeholder, tone: "t3" });
  if (typed && remaining) put(grid, left + 2 + width(typed), r, { text: remaining, tone: "t3" });
  if (typed && padding && !suggested) put(grid, left + 2, r, { text: typed.slice(0, padding), tone: "t3" });
  const under = Array.from(typed)[caret] ?? Array.from(remaining)[0] ?? " ";
  if (!suggested) put(grid, left + 2 + caret, r, { text: under, tone: caret < typed.length ? "t1" : "t3" }, true);
}
