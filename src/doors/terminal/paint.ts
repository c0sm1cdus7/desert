// A resolved screen into cells: each piece of the UI rules is drawn once, here, and decides nothing.
import { surfaceTexts as said } from "../../texts/surface.texts.ts";
import type { Body, HintKey, Screen, Span } from "../../surface/contract/contract.ts";
import { blankCell, fit, put, putRight, width, type Grid } from "./cells.ts";
import { drawFocus, drawPanel, drawRow, drawThread, keysOf } from "./thread.ts";
interface Size {
  readonly cols: number;
  readonly rows: number;
}
/** The name of each hint's key: every hint has one in the catalog, or the door does not compile. */
export const keyNames: Readonly<Record<HintKey, string>> = said.controls;
/** How many lines of content a terminal of this height has. */
export const contentRows = (rows: number): number => rows - 8;
const edgeOf = (cols: number): number => (cols >= 60 ? 2 : 1);
const blockOf = (cols: number): number => Math.min(76, cols - 2 * edgeOf(cols));

export const barIcons = {
  connected: ["●", "ok"],
  connecting: ["●", "wait"],
  "signal-lost": ["×", "cut"],
  disconnected: ["×", "t3"],
} as const;
function drawList(grid: Grid, body: Extract<Body, { kind: "list" }>, left: number, block: number): void {
  let r = 4;
  const note = (arrow: string, n?: number): void => {
    if (n) put(grid, left + 1, r++, { text: `${arrow} ${n} ${said.more}`, tone: "t3" });
  };
  body.stacks.forEach((stack, i) => {
    if (i) r += 1;
    put(grid, left, r++, { text: stack.title, tone: "t3" });
    note("↑", stack.above);
    if (!stack.rows.length) put(grid, left + 1, r++, { text: stack.empty ?? "", tone: "t1" });
    const how = { keys: keysOf(stack.rows), reads: stack.reads === true };
    for (const row of stack.rows) drawRow(grid, r++, { left, block }, row, how);
    note("↓", stack.below);
  });
}

function drawBars(grid: Grid, screen: Screen, cols: number, edge: number): void {
  const rows = grid.length;
  const [icon, tone] = barIcons[screen.state];
  const bar: Span[] = [
    { text: icon, tone },
    { text: ` ${screen.clock}`, tone: "t1" },
    ...(screen.battery ? [{ text: ` ${screen.battery}`, tone: "t2" } as const] : []),
  ];
  const used = bar.reduce((sum, span) => sum + width(span.text), 0);
  put(grid, edge, 0, { text: fit(screen.title, cols - 2 * edge - used - 2), tone: "t1", bold: true });
  putRight(grid, cols - edge, 0, bar);
  put(grid, 0, 1, { text: "─".repeat(cols), tone: "line" });
  put(grid, 0, rows - 2, { text: "─".repeat(cols), tone: "line" });
  const narrow = cols < 60;
  const fixed: Span[] = [
    ...(screen.menu
      ? ([
          { text: `${said.chords.menu}${narrow ? "  " : " "}`, tone: "t2" },
          { text: narrow ? "" : `${said.keys.menu}  `, tone: "t3" },
        ] as const)
      : []),
    { text: narrow ? said.chords.quit : `${said.chords.quit} `, tone: "t2" },
    { text: narrow ? "" : said.keys.quit, tone: "t3" },
  ];
  let col = edge;
  for (const span of fixed) col = put(grid, col, rows - 1, span);
  const hints = [...screen.hints];
  const size = (): number => hints.reduce((sum, h) => sum + width(keyNames[h.intent]) + width(h.does) + 3, 0) - 2;
  while (hints.length && size() > cols - edge - col - 2) hints.shift();
  putRight(
    grid,
    cols - edge,
    rows - 1,
    hints.flatMap((h, i) => [
      { text: `${keyNames[h.intent]} `, tone: "t2" as const },
      { text: i === hints.length - 1 ? h.does : `${h.does}  `, tone: "t3" as const },
    ]),
  );
}

export function paint(screen: Screen, { cols, rows }: Size): Grid {
  const grid: Grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => blankCell));
  if (cols < minimum.cols || rows < minimum.rows) {
    put(grid, 0, 0, { text: said.tooSmall, tone: "t1" });
    return grid;
  }
  const edge = edgeOf(cols);
  const block = blockOf(cols);
  const left = Math.floor((cols - block) / 2);
  drawBars(grid, screen, cols, edge);
  const { panel, body } = screen;
  const side = cols >= sideBySide && !panel?.full;
  if (panel && !side && (panel.full || panel.focused)) drawPanel(grid, panel, edge, cols - 2 * edge, -1);
  else if (panel && side) {
    drawBody(grid, body, edge, split - edge - 1, cols);
    drawPanel(grid, panel, split + 2, cols - split - 4, split);
  } else drawBody(grid, body, left, block, cols);
  return grid;
}
const minimum = { cols: 40, rows: 16 };
const sideBySide = 100;
const split = 53;
function drawBody(grid: Grid, body: Body, left: number, block: number, cols: number): void {
  if (body.kind === "list") drawList(grid, body, left, block);
  else if (body.kind === "focus") drawFocus(grid, body, cols);
  else drawThread(grid, body, left, block);
}
