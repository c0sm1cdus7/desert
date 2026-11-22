// Cells and the bytes that draw them: a terminal knows nothing else.
import { wide, width } from "../../fields/column-width.ts";
import type { Span, Theme } from "../../surface/contract/contract.ts";
import type { Tone } from "../../surface/contract/tones.ts";
import type { ColorToken } from "../../surface/pieces/tokens.ts";
export { wide, width } from "../../fields/column-width.ts";

type Palette = Readonly<Record<ColorToken, number>>;
// The hex values of the UI rules, at their nearest 256 colors.
// Data tones (azul, violeta, rosa, lima, arena) in each theme, from the UI rules' hex values.
const data = {
  dark: { d1: 75, d2: 141, d3: 211, d4: 185, d5: 180 },
  light: { d1: 25, d2: 62, d3: 162, d4: 100, d5: 94 },
  contrast: { d1: 111, d2: 183, d3: 218, d4: 191, d5: 223 },
};
const palettes: Readonly<Record<Theme, Palette>> = {
  dark: {
    bg: 232,
    t1: 255,
    t2: 248,
    t3: 244,
    line: 236,
    being: 80,
    ok: 114,
    wait: 214,
    cut: 203,
    focus: 234,
    ...data.dark,
  },
  light: {
    bg: 255,
    t1: 234,
    t2: 240,
    t3: 242,
    line: 253,
    being: 30,
    ok: 28,
    wait: 94,
    cut: 124,
    focus: 254,
    ...data.light,
  },
  contrast: {
    ...data.contrast,
    bg: 16,
    t1: 231,
    t2: 253,
    t3: 250,
    line: 240,
    being: 86,
    ok: 120,
    wait: 214,
    cut: 209,
    focus: 235,
  },
};
export interface Cell {
  readonly char: string;
  readonly tone: Tone;
  readonly bold: boolean;
  readonly inverse: boolean;
  readonly lit?: boolean;
  readonly edge?: boolean;
  readonly rgb?: Span["rgb"];
}
export type Grid = Cell[][];
export const blankCell: Cell = { char: " ", tone: "t1", bold: false, inverse: false };
export const fit = (text: string, room: number): string =>
  width(text) <= room
    ? text
    : `${Array.from(text)
        .slice(0, Math.max(room - 1, 0))
        .join("")
        .trimEnd()}…`;

export function light(grid: Grid, row: number, col: number, length: number): void {
  const line = grid[row];
  for (let at = col; line && at < col + length; at++) {
    const cell = line[at];
    if (cell) line[at] = { ...cell, lit: true };
  }
}
const edges = { top: ["▗", "▄", "▖"], bottom: ["▝", "▀", "▘"] } as const;
export function edge(grid: Grid, row: number, col: number, length: number, side: keyof typeof edges): void {
  const [start, middle, end] = edges[side];
  const chars = [start, ...Array.from({ length: length - 2 }, () => middle), end];
  chars.forEach((char, i) => {
    const line = grid[row];
    if (line && line[col + i]) line[col + i] = { ...blankCell, char, edge: true };
  });
}
export function put(grid: Grid, col: number, row: number, span: Span, inverse = false): number {
  let at = col;
  for (const char of span.text.replace(/\p{Cc}/gu, " ")) {
    const line = grid[row];
    if (line && at >= 0 && at < line.length) {
      const lit = line[at]?.lit ?? false;
      line[at] = {
        char,
        tone: span.tone,
        bold: span.bold ?? false,
        inverse,
        lit,
        ...(span.rgb ? { rgb: span.rgb } : {}),
      };
    }
    at += 1;
    if (wide.test(char)) {
      if (line && at < line.length) line[at] = { ...blankCell, char: "" };
      at += 1;
    }
  }
  return at;
}
export const putRight = (grid: Grid, end: number, row: number, spans: readonly Span[], inverse = false): void => {
  let col = end - spans.reduce((sum, span) => sum + width(span.text), 0);
  for (const span of spans) col = put(grid, col, row, span, inverse);
};

const truecolor = (hex: string): string => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(";");
const style = (cell: Cell, tones: Palette): string => {
  if (cell.edge) return `\x1b[0;38;5;${tones.focus};48;5;${tones.bg}m`;
  if (cell.rgb) {
    const ink = cell.rgb.fg ? `38;2;${truecolor(cell.rgb.fg)}` : `38;5;${tones[cell.tone]}`;
    return `\x1b[0;${ink};${cell.rgb.bg ? `48;2;${truecolor(cell.rgb.bg)}` : `48;5;${tones.bg}`}m`;
  }
  const ink = `38;5;${tones[cell.tone]}`;
  const ground = `48;5;${cell.lit ? tones.focus : tones.bg}`;
  if (!cell.inverse) return `\x1b[0;${cell.bold ? "1;" : ""}${ink};${ground}m`;
  return `\x1b[0;${cell.bold ? "1;" : ""}38;5;${tones.bg};48;5;${tones[cell.tone]}m`;
};
const rowBytes = (row: readonly Cell[], tones: Palette): string => {
  let out = "";
  let last = "";
  for (const cell of row) {
    const next = style(cell, tones);
    if (next !== last) out += next;
    last = next;
    out += cell.char;
  }
  return out;
};

/** The bytes that turn the previous frame into this one: only the rows that changed. */
export function bytesOf(grid: Grid, before?: Grid, theme: Theme = "dark"): string {
  const tones = palettes[theme];
  return grid
    .map((row, r) => {
      const bytes = rowBytes(row, tones);
      const same = before && before[r]?.length === row.length && rowBytes(before[r], tones) === bytes;
      return same ? "" : `\x1b[${r + 1};1H${bytes}`;
    })
    .join("");
}
/** The screen as text, for tests: what a person reads. */
export const textOf = (grid: Grid): readonly string[] =>
  grid.map(row =>
    row
      .map(cell => cell.char)
      .join("")
      .trimEnd(),
  );
