// Every renderer against what the contract hands it, on every screen the surface can reach.
import { describe, expect, it } from "vitest";
import { chosenText, hintTexts, mainTexts, panelTexts, walk } from "../../../tests/support/surface-walk.ts";
import { fresh } from "../../../tests/support/surface-tools.ts";
import type { HintKey, Intent, Screen } from "../../surface/contract/contract.ts";
import { bytesOf, textOf, type Grid } from "./cells.ts";
import { keysOf } from "./input.ts";
import { contentRows, keyNames, paint } from "./paint.ts";

const size = { cols: 200, rows: 60 };
const split = 53;
const squeeze = (text: string): string => text.replace(/\s+/gu, "");
/** Everything expected shows up, in this order, however the renderer wrapped it. */
const inOrder = (seen: string, expected: readonly string[]): string | undefined => {
  let from = 0;
  for (const text of expected.map(squeeze).filter(Boolean)) {
    const at = seen.indexOf(text, from);
    if (at < 0) return text;
    from = at;
  }
  return undefined;
};
const column = (lines: readonly string[], from: number, to?: number): string =>
  squeeze(lines.map(line => line.slice(from, to).replace(/[─│]/gu, "")).join(""));
const highlighted = (grid: Grid): string =>
  squeeze(grid.flatMap(row => row.filter(cell => cell.inverse || cell.lit).map(cell => cell.char)).join(""));
const pressKey: Readonly<Record<string, string>> = {
  enter: "\r",
  esc: "\x1b",
  tab: "\t",
  espacio: " ",
  f: "f",
  "↑↓": "\x1b[A",
};
const expects: readonly (readonly [HintKey, Intent])[] = [
  ["move", { kind: "up" }],
  ["confirm", { kind: "confirm" }],
  ["cancel", { kind: "cancel" }],
  ["switch", { kind: "switch" }],
  ["full", { kind: "type", text: "f" }],
  ["mark", { kind: "type", text: " " }],
];
const check = (screen: Screen, label: string): void => {
  const grid = paint(screen, size);
  const lines = textOf(grid);
  const side = screen.panel && !screen.panel.full;
  const main = column(lines, 0, side ? split : undefined);
  if (!screen.panel?.full) expect(inOrder(main, mainTexts(screen)), `${label}: falta en el contenido`).toBeUndefined();
  if (screen.panel) {
    expect(inOrder(column(lines, side ? split : 0), panelTexts(screen)), `${label}: falta en el panel`).toBeUndefined();
  }
  expect(inOrder(squeeze(lines.at(-1) ?? ""), hintTexts(screen)), `${label}: falta en la Toolbar`).toBeUndefined();
  expect(squeeze(lines[0] ?? "")).toContain(squeeze(screen.title));
  const chosen = chosenText(screen);
  if (chosen) expect(highlighted(grid), `${label}: no marca lo elegido`).toContain(squeeze(chosen));
  expect(bytesOf(grid)).not.toBe("");
};

describe("the terminal renderer, against the contract", () => {
  it("shows what the contract says on every reachable screen", async () => {
    const stops = await walk(fresh, contentRows(size.rows), 300);
    expect(stops.length).toBeGreaterThan(50);
    for (const { screen, path } of stops) check(screen, JSON.stringify(path.map(step => step.kind)));
  });
  it("reaches a thread with a panel, a walk with options and a result", async () => {
    const screens = (await walk(fresh, contentRows(size.rows), 300)).map(stop => stop.screen);
    expect(screens.some(screen => screen.panel?.focused)).toBe(true);
    expect(screens.some(screen => screen.panel && !screen.panel.focused)).toBe(true);
    expect(screens.some(screen => screen.body.kind === "thread" && screen.body.options?.length)).toBe(true);
    expect(screens.some(screen => screen.hints.some(hint => hint.does === "cerrar"))).toBe(true);
  });
  it("sends the intent each of its hints promises", () => {
    for (const [hint, intent] of expects) {
      expect(keysOf(pressKey[keyNames[hint]] ?? ""), hint).toEqual([intent]);
    }
  });
});
