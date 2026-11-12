// A thread, and what opened beside it, in cells. Which part is turned down comes from the screen.
import { surfaceTexts as said } from "../../texts/surface.texts.ts";
import type { Body, Panel, Row, Span, ThreadEvent } from "../../surface/contract.ts";
import type { Tone } from "../../surface/tones.ts";
import { edge, fit, light, put, putRight, width, type Grid } from "./cells.ts";

/** A drawn line is cut where the block ends, never with an ellipsis: it is a picture, not a sentence. */
function drawLine(grid: Grid, r: number, left: number, block: number, spans: readonly Span[]): void {
  let col = left + 1;
  for (const span of spans)
    col = put(grid, col, r, {
      ...span,
      text: Array.from(span.text)
        .slice(0, Math.max(left + block - col, 0))
        .join(""),
    });
}
type Listing = Readonly<{ keys: number; reads?: boolean }>;
/** How wide the keys of a list are drawn, brackets included: nothing when no row of it has one. Every row of the
 * list starts after that, so what they say lines up whatever key each takes. */
export const keysOf = (rows: readonly Row[]): number =>
  Math.max(0, ...rows.map(row => (row.key ? width(row.key) + 2 : 0)));
/** A row that is written in: its name when it has one, and what is typed with the caret where it stands. */
function drawWritten(grid: Grid, r: number, x: number, row: Row & { entry: NonNullable<Row["entry"]> }): void {
  const col = row.title ? put(grid, x, r, { text: row.title, tone: "t2" }) + 2 : x;
  put(grid, col, r, { text: "›", tone: "t2" });
  put(grid, col + 2, r, { text: row.entry.typed, tone: "t1" });
  const under = Array.from(row.entry.typed)[row.entry.caret] ?? " ";
  put(grid, col + 2 + row.entry.caret, r, { text: under, tone: "t1" }, true);
}
/** One row of a list. In a list that is read, what a row says of its datum leads; in one that is chosen from, its
 * name does. A row with one text says it in the leading tone. */
export function drawRow(
  grid: Grid,
  r: number,
  at: Readonly<{ left: number; block: number }>,
  row: Row,
  how: Listing,
): void {
  const { left, block } = at;
  const keyed = how.keys > 0;
  if (row.spans) {
    drawLine(grid, r, left, block, row.spans);
    return;
  }
  const x = keyed ? left + 2 + how.keys : left + 1;
  if (row.entry) {
    drawWritten(grid, r, row.title ? x : left + 1, { ...row, entry: row.entry });
    return;
  }
  const on = row.selected ?? false;
  if (on) for (let c = left; c < left + block; c++) put(grid, c, r, { text: " ", tone: "t1" }, true);
  /** What cannot be chosen now is all in the faintest tone: its key, its name and why. */
  const quiet = (fallback: Tone): Tone => (row.off ? "t3" : fallback);
  const tone = (fallback: Tone): Tone => (on ? "t1" : quiet(fallback));
  if (keyed && row.key) put(grid, left + 1, r, { text: `[${row.key}]`, tone: tone("t3") }, on);
  const detail = row.detail ?? "";
  /** What does not fit is cut from the name: the datum at the right is read whole while the name keeps a dozen. */
  const shown = fit(detail, Math.max(block - (x - left) - Math.min(width(row.title), 12) - 2, 10));
  const fact = (how.reads === true || row.still === true) && detail !== "";
  put(
    grid,
    x,
    r,
    { text: fit(row.title, block - (x - left) - width(shown) - 2), tone: tone(fact ? "t2" : "t1"), bold: on },
    on,
  );
  if (shown) putRight(grid, left + block - 1, r, [{ text: shown, tone: tone(row.tone ?? (fact ? "t1" : "t2")) }], on);
}

/** Word wrap that keeps each word's tone; a span never starts a line with a space. A line break in what is said
 * starts a new line: a block is read as it was written. */
function wrapped(spans: readonly Span[], room: number): readonly (readonly Span[])[] {
  const lines: Span[][] = [[]];
  let used = 0;
  const fresh = (): void => {
    lines.push([]);
    used = 0;
  };
  for (const span of spans) {
    span.text.split("\n").forEach((part, i) => {
      if (i) fresh();
      for (const word of part.split(/(?<=\s)/u)) {
        if (used + width(word.trimEnd()) > room && used > 0) fresh();
        lines.at(-1)?.push({ ...span, text: word });
        used += width(word);
      }
    });
  }
  return lines;
}
interface Drawn {
  readonly spans: readonly Span[];
  readonly indent: number;
  readonly lit: boolean;
}
function linesOf(event: ThreadEvent, block: number): readonly Drawn[] {
  const quiet = (spans: readonly Span[]): readonly Span[] =>
    event.muted ? spans.map(span => ({ ...span, tone: "t3" as const })) : spans;
  const on = event.selected ?? false;
  const indent = event.head || event.nested ? 1 : 0;
  return [
    ...(event.head ? [{ spans: quiet(event.head), indent: 0, lit: on }] : []),
    ...(event.quote ? [{ spans: [{ text: fit(event.quote, block - 2), tone: "t3" as const }], indent, lit: on }] : []),
    ...wrapped(quiet(event.text), block - 1 - indent).map(spans => ({ spans, indent, lit: on })),
    ...(event.attachments ?? []).map(attachment => ({
      spans:
        event.muted && !attachment.selected
          ? [{ text: `${attachment.title} · ${attachment.detail}`, tone: "t3" as const }]
          : [
              { text: attachment.title, tone: "t1" as const, bold: true },
              { text: ` · ${attachment.detail}`, tone: "t3" as const },
            ],
      indent,
      lit: attachment.selected ?? false,
    })),
  ];
}
const blank: Drawn = { spans: [], indent: 0, lit: false };

function drawEntry(grid: Grid, body: Extract<Body, { kind: "thread" }>, left: number): void {
  const r = grid.length - 4;
  if (body.reference) put(grid, left, r - 1, { text: body.reference, tone: "t3" });
  if (!body.entry) return;
  const { typed, caret, placeholder, suggested = false } = body.entry;
  put(grid, left, r, { text: "›", tone: "t2" });
  /** What a key would replace is lit whole; what is being written has the caret where it stands. */
  if (typed) put(grid, left + 2, r, { text: typed, tone: "t1" }, suggested);
  else put(grid, left + 3, r, { text: placeholder, tone: "t3" });
  if (!suggested) put(grid, left + 2 + caret, r, { text: Array.from(typed)[caret] ?? " ", tone: "t1" }, true);
}
/** The options of a question, above the toolbar: with how many are left out before the first and after the last. */
function drawOptions(grid: Grid, options: readonly Row[], more: Left, left: number, block: number): void {
  const keyed = options.some(row => row.key);
  let r = grid.length - 3 - options.length - Number(more.above > 0) - Number(more.below > 0);
  if (more.above) put(grid, left + 1, r++, { text: `↑ ${more.above} ${said.more}`, tone: "t3" });
  for (const row of options) drawRow(grid, r++, { left, block }, row, { keys: keyed ? 3 : 0 });
  if (more.below) put(grid, left + 1, r, { text: `↓ ${more.below} ${said.more}`, tone: "t3" });
}
type Left = Readonly<{ above: number; below: number }>;
export function drawThread(grid: Grid, body: Extract<Body, { kind: "thread" }>, left: number, block: number): void {
  const options = body.options ?? [];
  const more = body.more ?? { above: 0, below: 0 };
  const listed = options.length + Number(more.above > 0) + Number(more.below > 0);
  const taken = options.length ? listed + 1 : Number(Boolean(body.entry)) * 2 + Number(Boolean(body.reference));
  const bottom = grid.length - 4 - taken;
  const lines = body.events.flatMap((event, i) => [...(i && !event.nested ? [blank] : []), ...linesOf(event, block)]);
  const room = bottom - 3 + 1;
  const lit = lines.findIndex(line => line.lit);
  const overflow = Math.max(lines.length - room + (lines.length > room ? 1 : 0), 0);
  const cut = lit >= 0 ? Math.min(overflow, lit) : overflow;
  const shown = lines.slice(cut, cut + room - (cut ? 1 : 0));
  if (cut) put(grid, left, 3, { text: `↑ ${cut} ${said.more}`, tone: "t3" });
  const rowOf = (i: number): number => bottom - shown.length + 1 + i;
  const first = shown.findIndex(line => line.lit);
  const last = shown.findLastIndex(line => line.lit);
  const above = first > 0 ? shown[first - 1] === blank : !cut;
  const below = last < shown.length - 1 ? shown[last + 1] === blank : true;
  if (first >= 0 && above && below) {
    edge(grid, rowOf(first) - 1, left - 1, block + 2, "top");
    edge(grid, rowOf(last) + 1, left - 1, block + 2, "bottom");
  }
  shown.forEach((line, i) => {
    const r = rowOf(i);
    if (line.lit) light(grid, r, left - 1, block + 2);
    let col = left + line.indent;
    for (const span of line.spans) col = put(grid, col, r, span);
  });
  drawOptions(grid, options, more, left, block);
  drawEntry(grid, body, left);
}
/** What opened: its header, its line, and as much as fits from where it is scrolled. */
export function drawPanel(grid: Grid, panel: Panel, col: number, room: number, split: number): void {
  const rows = grid.length;
  const quiet = (tone: Tone): Tone => (panel.focused ? tone : "t3");
  const detail = panel.detail ?? "";
  put(grid, col, 2, { text: fit(panel.title, room - width(detail) - 2), tone: quiet("t1") });
  putRight(grid, col + room, 2, [{ text: detail, tone: "t3" }]);
  if (split >= 0) for (let r = 2; r < rows - 2; r++) put(grid, split, r, { text: "│", tone: "line" });
  for (let c = Math.max(split + 1, 0); c < (grid[3]?.length ?? 0); c++) put(grid, c, 3, { text: "─", tone: "line" });
  const lines = panel.lines.flatMap(line => (line.length ? wrapped(line, room) : [[]]));
  lines.slice(panel.top, panel.top + rows - 7).forEach((line, i) => {
    let c = col;
    for (const span of line) c = put(grid, c, 4 + i, { ...span, tone: quiet(span.tone) });
  });
}
/** One thing in the middle: a greeting, and what to do. */
export function drawFocus(grid: Grid, body: Extract<Body, { kind: "focus" }>, cols: number): void {
  const middle = Math.floor(grid.length / 2) - 1;
  put(grid, Math.floor((cols - width(body.title)) / 2), middle, { text: body.title, tone: "t1", bold: true });
  body.lines.forEach((line, i) => {
    let col = Math.floor((cols - line.reduce((sum, span) => sum + width(span.text), 0)) / 2);
    for (const span of line) col = put(grid, col, middle + 2 + i, span);
  });
}
