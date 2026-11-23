// The terminal as a renderer the conformance kit reads: it paints a screen and reads its own grid back as plain data.
import type { Drawn } from "../../src/checks/renderer-conformance.ts";
import type { HintKey, Intent, Screen } from "../../src/surface/contract/contract.ts";
import { hintSends } from "../../src/surface/contract/hint-sends.ts";
import type { Language } from "../../src/fields/languages.ts";
import { wordsIn } from "../../src/fields/phrases.ts";
import { surfaceTexts } from "../../src/texts/surface.texts.ts";
import { textOf, type Grid } from "../../src/doors/terminal/cells.ts";
import { keysOf } from "../../src/doors/terminal/input.ts";
import { barIcons, keyNames } from "../../src/doors/terminal/paint.ts";

export const size = { cols: 200, rows: 60 };
const split = 53;
/** The words a terminal may add of its own, in the language it draws: its control names, its chords and keys,
 * and what it says when cut. */
export const catalogIn = (language: Language): readonly string[] => {
  const said = wordsIn(surfaceTexts, language);
  return [
    ...Object.values(said.controls),
    ...Object.values(said.chords),
    ...Object.values(said.keys),
    said.more,
    said.tooSmall,
  ];
};
/** The bytes a key name stands for on a terminal, in the language it draws: the move control is both arrows. */
export const sent = (name: string, language: Language): readonly Intent[] => {
  const { controls } = wordsIn(surfaceTexts, language);
  const pressKey: Readonly<Record<string, readonly string[]>> = {
    [controls.confirm]: ["\r"],
    [controls.cancel]: ["\x1b"],
    [controls.switch]: ["\t"],
    [controls.mark]: [" "],
    [controls.full]: ["f"],
    [controls.move]: ["\x1b[A", "\x1b[B"],
  };
  return (pressKey[name] ?? []).flatMap(bytes => keysOf(bytes));
};
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
  const chords: readonly string[] = Object.values(wordsIn(surfaceTexts, screen.language).chords);
  const last = grid.at(-1) ?? [];
  const names = last
    .map(cell => (cell.tone === "t2" ? cell.char : "\n"))
    .join("")
    .split("\n")
    .map(name => name.trim())
    .filter(name => name !== "" && !chords.includes(name));
  return names.map(name => {
    const hints = hintKeys.filter(key => keyNames(screen.language)[key] === name);
    const hint = hints.find(key => screen.hints.some(known => known.intent === key)) ?? hints[0];
    if (hint === undefined) throw new Error(`a control no hint is named: ${name}`);
    return { hint, name, sends: sent(name, screen.language) };
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
    menu: (lines.at(-1) ?? "").includes(wordsIn(surfaceTexts, screen.language).chords.menu),
    controls: controlsOf(grid, screen),
  };
}
