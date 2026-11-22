// Written entries in threads and rows: text, the unfilled shape, and the cursor.
import type { Body } from "../../surface/contract/contract.ts";
import type { EntryPiece } from "../../surface/pieces/pieces.ts";
import { put, width, type Grid } from "./cells.ts";
/** The chevron, then what is written from two cells after it, each part where the parts before it end, and the
 * caret where it stands. What is written lit whole is one span, the first; then there is no caret. */
function drawWritten(grid: Grid, r: number, col: number, entry: EntryPiece): void {
  put(grid, col, r, { text: "›", tone: "t2" });
  let at = col + 2;
  entry.written.forEach((span, i) => {
    put(grid, at, r, span, entry.whole && i === 0);
    at += width(span.text);
  });
  if (entry.placeholder) put(grid, col + 3, r, entry.placeholder);
  if (!entry.caret) return;
  const typed = Array.from(entry.written.map(span => span.text).join(""));
  put(grid, col + 2 + width(typed.slice(0, entry.caret.at).join("")), r, entry.caret.under, true);
}
/** A row that is written in: its name when it has one, and what is typed with the caret where it stands. */
export function drawRowEntry(grid: Grid, r: number, x: number, entry: EntryPiece): void {
  drawWritten(grid, r, entry.label ? put(grid, x, r, entry.label) + 2 : x, entry);
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
  const offset = width(Array.from(typed).slice(0, caret).join(""));
  if (!suggested) put(grid, left + 2 + offset, r, { text: under, tone: caret < typed.length ? "t1" : "t3" }, true);
}
