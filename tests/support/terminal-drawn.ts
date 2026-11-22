// The terminal as a renderer the conformance kit reads: it paints a screen and reads its own grid back as plain data.
import type { Drawn } from "../../src/checks/renderer-conformance.ts";
import type { HintKey, Intent, Screen } from "../../src/surface/contract/contract.ts";
import { hintSends } from "../../src/surface/contract/hint-sends.ts";
import { surfaceTexts as said } from "../../src/texts/surface.texts.ts";
import { textOf, type Grid } from "../../src/doors/terminal/cells.ts";
import { keysOf } from "../../src/doors/terminal/input.ts";
import { barIcons, keyNames } from "../../src/doors/terminal/paint.ts";

export const size = { cols: 200, rows: 60 };
const split = 53;
/** The words a terminal may add of its own: its control names, its chords and keys, and what it says when cut. */
export const catalog = [
  ...Object.values(said.controls),
  ...Object.values(said.chords),
  ...Object.values(said.keys),
  said.more,
  said.tooSmall,
];
/** The bytes a key name stands for on a terminal: the move control is both arrows. */
const pressKey: Readonly<Record<string, readonly string[]>> = {
  [said.controls.confirm]: ["\r"],
  [said.controls.cancel]: ["\x1b"],
  [said.controls.switch]: ["\t"],
  [said.controls.mark]: [" "],
  [said.controls.full]: ["f"],
  [said.controls.move]: ["\x1b[A", "\x1b[B"],
};
const chords: readonly string[] = Object.values(said.chords);
export const sent = (name: string): readonly Intent[] => (pressKey[name] ?? []).flatMap(bytes => keysOf(bytes));
export const hintKeys = Object.keys(hintSends).filter((key): key is HintKey => key in hintSends);
const column = (lines: readonly string[], from: number, to?: number): readonly string[] =>
  lines.map(line => line.slice(from, to).replace(/[─│]/gu, ""));
const highlighted = (grid: Grid): string =>
  grid.flatMap(row => row.filter(cell => cell.inverse || cell.lit).map(cell => cell.char)).join("");
const states = ["connected", "connecting", "signal-lost", "disconnected"] as const satisfies readonly Screen["state"][];
/** The state the Barra shows, read back from the icon's character and tone: one of them, or the read fails. */
function stateOf(grid: Grid): Screen["state"] {
  const bar = grid[0] ?? [];
  const shown = states.filter(state =>
    bar.some(cell => cell.char === barIcons[state][0] && cell.tone === barIcons[state][1]),
  );
  const [state] = shown;
  if (state === undefined || shown.length > 1) throw new Error(`the Barra shows no single state: ${shown.join(", ")}`);
  return state;
}
/** The toolbar read as its controls: each name in its key tone, after the fixed chords; a name two hints share is
 * the one of them the screen hints. */
function controlsOf(grid: Grid, screen: Screen): Drawn["controls"] {
  const last = grid.at(-1) ?? [];
  const names = last
    .map(cell => (cell.tone === "t2" ? cell.char : "\n"))
    .join("")
    .split("\n")
    .map(name => name.trim())
    .filter(name => name !== "" && !chords.includes(name));
  return names.map(name => {
    const hints = hintKeys.filter(key => keyNames[key] === name);
    const hint = hints.find(key => screen.hints.some(known => known.intent === key)) ?? hints[0];
    if (hint === undefined) throw new Error(`a control no hint is named: ${name}`);
    return { hint, name, sends: sent(name) };
  });
}
export function drawn(screen: Screen, grid: Grid): Drawn {
  const lines = textOf(grid);
  const content = lines.slice(2, -2);
  const side = screen.panel && !screen.panel.full;
  const state = stateOf(grid);
  return {
    bar: lines.slice(0, 1),
    main: screen.panel?.full ? [] : column(content, 0, side ? split : undefined),
    ...(screen.panel ? { panel: column(content, side ? split : 0) } : {}),
    toolbar: lines.slice(-1),
    marked: [highlighted(grid)],
    state,
    menu: (lines.at(-1) ?? "").includes(said.chords.menu),
    controls: controlsOf(grid, screen),
  };
}
