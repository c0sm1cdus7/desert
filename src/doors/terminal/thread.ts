// A thread, its rows, and what opened beside it, in cells. Which part is turned down comes from the screen.
import { drawEntry, drawRowEntry } from "./entry.ts";
import { surfaceTexts as said } from "../../texts/surface.texts.ts";
import type { Body, Panel, Span, ThreadEvent } from "../../surface/contract/contract.ts";
import type { OptionsPiece, RowPiece } from "../../surface/pieces/pieces.ts";
import type { Tone } from "../../surface/contract/tones.ts";
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
/** How wide the keys of a list are drawn, brackets included: nothing when no row of it has one. Every row of the
 * list starts after that, so what they say lines up whatever key each takes. */
export const keysOf = (rows: readonly RowPiece[]): number =>
  Math.max(0, ...rows.map(row => (row.as === "text" && row.key ? width(row.key.text) + 2 : 0)));
/** One row of a list. Which of its two texts is kept whole when both do not fit comes with the row. */
export function drawRow(
  grid: Grid,
  r: number,
  at: Readonly<{ left: number; block: number }>,
  row: RowPiece,
  keys: number,
): void {
  const { left, block } = at;
  const keyed = keys > 0;
  if (row.as === "line") {
    drawLine(grid, r, left, block, row.line);
    return;
  }
  const x = keyed ? left + 2 + keys : left + 1;
  if (row.as === "entry") {
    drawRowEntry(grid, r, row.entry.label ? x : left + 1, row.entry);
    return;
  }
  const on = row.chosen;
  if (on) for (let c = left; c < left + block; c++) put(grid, c, r, { text: " ", tone: "t1" }, true);
  if (keyed && row.key) put(grid, left + 1, r, { ...row.key, text: `[${row.key.text}]` }, on);
  const datum = row.datum?.text ?? "";
  const leads = row.whole === "datum";
  const room = block - (x - left);
  /** What does not fit is cut from the side that is not kept whole: that one keeps a dozen. */
  const [first, second] = leads ? [datum, row.name.text] : [row.name.text, datum];
  const whole = fit(first, Math.max(room - Math.min(width(second), 12) - 2, 10));
  const cut = fit(second, room - width(whole) - 2);
  const [shown, title] = leads ? [whole, cut] : [cut, whole];
  put(grid, x, r, { ...row.name, text: title }, on);
  if (shown && row.datum) putRight(grid, left + block - 1, r, [{ ...row.datum, text: shown }], on);
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

/** The options of a question, above the toolbar: with how many are left out before the first and after the last. */
function drawOptions(grid: Grid, options: OptionsPiece | undefined, left: number, block: number): void {
  const rows = options?.rows ?? [];
  let r = grid.length - 3 - rows.length - Number(Boolean(options?.above)) - Number(Boolean(options?.below));
  if (options?.above) put(grid, left + 1, r++, options.above.text);
  for (const row of rows) drawRow(grid, r++, { left, block }, row, options?.keyed ? 3 : 0);
  if (options?.below) put(grid, left + 1, r, options.below.text);
}
export function drawThread(
  grid: Grid,
  body: Extract<Body, { kind: "thread" }>,
  options: OptionsPiece | undefined,
  at: Readonly<{ left: number; block: number }>,
): void {
  const { left, block } = at;
  const listed = (options?.rows.length ?? 0) + Number(Boolean(options?.above)) + Number(Boolean(options?.below));
  const taken = options?.rows.length ? listed + 1 : Number(Boolean(body.entry)) * 2 + Number(Boolean(body.reference));
  const bottom = grid.length - 4 - taken;
  const lines = body.events.flatMap((event, i) => [...(i && !event.nested ? [blank] : []), ...linesOf(event, block)]);
  const room = bottom - 3 + 1;
  const lit = lines.findIndex(line => line.lit);
  const overflow = Math.max(lines.length - room + (lines.length > room ? 1 : 0), 0);
  /** What does not fit is cut from the top; reading back brings it down a window at a time, saying what is below. */
  const cut = Math.max((lit >= 0 ? Math.min(overflow, lit) : overflow) - (body.read ?? 0) * Math.max(room - 2, 1), 0);
  const fits = room - (cut ? 1 : 0);
  /** What is left below is counted only where a line of what is said still fits above the count. */
  const under = fits > 1 && lines.length - cut > fits ? lines.length - cut - fits + 1 : 0;
  const shown = lines.slice(cut, cut + fits - (under ? 1 : 0));
  if (cut) put(grid, left, 3, { text: `↑ ${cut} ${said.more}`, tone: "t3" });
  if (under) put(grid, left, bottom, { text: `↓ ${under} ${said.more}`, tone: "t3" });
  const rowOf = (i: number): number => bottom - (under ? 1 : 0) - shown.length + 1 + i;
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
  drawOptions(grid, options, left, block);
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
