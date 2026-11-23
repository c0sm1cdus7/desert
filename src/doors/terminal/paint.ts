// The pieces of a screen into cells: each piece of the UI rules is drawn once, here, and decides nothing.
import type { Language } from "../../fields/languages.ts";
import type { Screen, Span } from "../../surface/contract/contract.ts";
import { piecesOf } from "../../surface/pieces/pieces-of.ts";
import type { ActionPiece, BarPiece, ContentPiece, ListPiece } from "../../surface/pieces/pieces.ts";
import type { NoticePiece, SurfacePiece, ToolbarPiece } from "../../surface/pieces/pieces.ts";
import { blankCell, fit, put, putRight, width, type Grid } from "./cells.ts";
import { drawFocus, drawPanel, drawRow, drawThread, keysOf } from "./thread.ts";
export { controlNames as keyNames } from "../../surface/pieces/controls.ts";
export { beats as barIcons } from "../../surface/pieces/piece-bar.ts";
interface Size {
  readonly cols: number;
  readonly rows: number;
}
/** How many lines of content a terminal of this height has. */
export const contentRows = (rows: number): number => rows - 8;
const edgeOf = (cols: number): number => (cols >= 60 ? 2 : 1);
const blockOf = (cols: number): number => Math.min(76, cols - 2 * edgeOf(cols));

function drawList(grid: Grid, list: ListPiece, left: number, block: number): void {
  let r = 4;
  const note = (notice?: NoticePiece): void => {
    if (notice) put(grid, left + 1, r++, notice.text);
  };
  list.stacks.forEach((stack, i) => {
    if (i) r += 1;
    put(grid, left, r++, stack.title);
    note(stack.above);
    note(stack.empty);
    const keys = keysOf(stack.rows);
    for (const row of stack.rows) drawRow(grid, r++, { left, block }, row, keys);
    note(stack.below);
  });
}
/** The Barra: the title, cut to what the beat, the clock and the battery leave. */
function drawBar(grid: Grid, bar: BarPiece, cols: number, edge: number): void {
  const live: Span[] = [
    { text: bar.beat.icon, tone: bar.beat.tone },
    { ...bar.clock, text: ` ${bar.clock.text}` },
    ...(bar.battery ? [{ ...bar.battery, text: ` ${bar.battery.text}` }] : []),
  ];
  const used = live.reduce((sum, span) => sum + width(span.text), 0);
  put(grid, edge, 0, { ...bar.title, text: fit(bar.title.text, cols - 2 * edge - used - 2) });
  putRight(grid, cols - edge, 0, live);
}
/** A fixed control: its key and what it does, two cells apart from the next; a narrow rail keeps only the key. */
const fixedSpans = (action: ActionPiece, last: boolean, narrow: boolean): readonly Span[] => {
  const gap = last ? "" : "  ";
  const key = narrow ? `${action.key.text}${gap}` : `${action.key.text} `;
  return [
    { ...action.key, text: key },
    { ...action.does, text: narrow ? "" : `${action.does.text}${gap}` },
  ];
};
/** The Toolbar: the fixed controls at the left; at the right, the aids, dropped from the first while they do not
 * fit. */
function drawToolbar(grid: Grid, toolbar: ToolbarPiece, cols: number, edge: number): void {
  const rows = grid.length;
  const narrow = cols < 60;
  const fixed = toolbar.fixed.flatMap((action, i) => fixedSpans(action, i === toolbar.fixed.length - 1, narrow));
  let col = edge;
  for (const span of fixed) col = put(grid, col, rows - 1, span);
  const aids = [...toolbar.aids];
  const size = (): number => aids.reduce((sum, a) => sum + width(a.key.text) + width(a.does.text) + 3, 0) - 2;
  while (aids.length && size() > cols - edge - col - 2) aids.shift();
  putRight(
    grid,
    cols - edge,
    rows - 1,
    aids.flatMap((action, i) => [
      { ...action.key, text: `${action.key.text} ` },
      { ...action.does, text: i === aids.length - 1 ? action.does.text : `${action.does.text}  ` },
    ]),
  );
}
function drawBars(grid: Grid, pieces: SurfacePiece, cols: number, edge: number): void {
  const rows = grid.length;
  const [bar, , toolbar] = pieces.zones;
  drawBar(grid, bar, cols, edge);
  put(grid, 0, 1, { text: "─".repeat(cols), tone: "line" });
  put(grid, 0, rows - 2, { text: "─".repeat(cols), tone: "line" });
  drawToolbar(grid, toolbar, cols, edge);
}

/** The pieces of one screen at one size: alone the small notice, when the size is under the minimum. */
function paintPieces(pieces: SurfacePiece, { cols, rows }: Size): Grid {
  const grid: Grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => blankCell));
  if (cols < minimum.cols || rows < minimum.rows) {
    put(grid, 0, 0, pieces.small.text);
    return grid;
  }
  const edge = edgeOf(cols);
  const block = blockOf(cols);
  const left = Math.floor((cols - block) / 2);
  drawBars(grid, pieces, cols, edge);
  const { main, beside } = pieces.zones[1];
  const side = cols >= sideBySide && !beside?.full;
  if (beside && !side && (beside.full || beside.focused)) drawPanel(grid, beside, edge, cols - 2 * edge, -1);
  else if (beside && side) {
    drawMain(grid, main, edge, split - edge - 1, cols, pieces.language);
    drawPanel(grid, beside, split + 2, cols - split - 4, split);
  } else drawMain(grid, main, left, block, cols, pieces.language);
  return grid;
}
export const paint = (screen: Screen, size: Size): Grid => paintPieces(piecesOf(screen), size);
const minimum = { cols: 40, rows: 16 };
const sideBySide = 100;
const split = 53;
function drawMain(grid: Grid, main: ContentPiece, left: number, block: number, cols: number, language: Language) {
  if (main.kind === "list") drawList(grid, main, left, block);
  else if (main.kind === "focus") drawFocus(grid, main, cols);
  else drawThread(grid, main, left, block, language);
}
