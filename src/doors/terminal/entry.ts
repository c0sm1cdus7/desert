// Written entries in threads and rows: what is written, the unfilled shape, and the caret.
import type { EntryPiece, ThreadPiece } from "../../surface/pieces/pieces.ts";
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
export function drawEntry(grid: Grid, thread: ThreadPiece, left: number): void {
  const r = grid.length - 4;
  if (thread.reference) put(grid, left, r - 1, thread.reference.text);
  if (thread.entry) drawWritten(grid, r, left, thread.entry);
}
