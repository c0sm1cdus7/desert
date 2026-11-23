// A row's identity is what choosing it does: unique on its screen, absent where nothing is chosen, kept as it moves.
import { describe, expect, it } from "vitest";
import { fresh, walked } from "../../../tests/support/surface-tools.ts";
import { pieceRules } from "../../checks/piece-rules.ts";
import { replayed } from "../../checks/surface-walk.ts";
import { piecesOf } from "../pieces/pieces-of.ts";
import { surfaceTexts } from "../../texts/surface.texts.ts";
import type { Intent, Row, Screen } from "../contract/contract.ts";
import { rowIdLimit } from "../contract/limits.ts";
import type { Tool, ViewRow } from "../contract/shown-tool.ts";
import { resolve } from "../router/resolve.ts";
import { startRouter } from "../router/router.ts";
import type { Session } from "./screen.ts";

const stops = await walked();
const bar = { language: "es", state: "connected", clock: "14:32", now: 5_000 } as const;
/** Every row a screen holds, as resolve gives it: what a tool brought along is still on it. */
function rowsOf({ body }: Screen): readonly Row[] {
  if (body.kind === "list") return body.stacks.flatMap(stack => stack.rows);
  return body.kind === "thread" ? (body.options ?? []) : [];
}
/** Where a person writes: a line with an entry, a control of a tool where the cursor stands included. */
const writtenIn = (row: Row): boolean => row.entry !== undefined;
/** How long each kind of tuple is, before the ordinal among equals. */
const lengths: Readonly<Record<string, number>> = { view: 3, talk: 3, act: 6, press: 3, answer: 2, makes: 3, other: 1 };
function wellFormed(id: string): boolean {
  const tuple: unknown = JSON.parse(id);
  if (!Array.isArray(tuple) || typeof tuple[0] !== "string") return false;
  const length = lengths[tuple[0]];
  if (length === undefined) return false;
  const ordinal: unknown = tuple.at(-1);
  return tuple.length === length || (tuple.length === length + 1 && typeof ordinal === "number" && ordinal >= 2);
}

describe("the identity of a row, over every walked screen", () => {
  it("is unique within a screen", () => {
    for (const { screen, path } of stops) {
      const ids = rowsOf(screen).flatMap(row => (row.id === undefined ? [] : [row.id]));
      expect(new Set(ids).size, JSON.stringify(path)).toBe(ids.length);
    }
  });
  it("is on a row iff it is not off, not still and not written in", () => {
    const rows = stops.flatMap(({ screen }) => rowsOf(screen));
    expect(rows.filter(row => row.id !== undefined).length).toBeGreaterThan(20);
    for (const row of rows) expect(row.id !== undefined, row.title).toBe(!row.off && !row.still && !writtenIn(row));
  });
  it("reads as a tuple of what choosing it does", () => {
    const ids = stops.flatMap(({ screen }) => rowsOf(screen).flatMap(row => (row.id ? [row.id] : [])));
    expect(ids.filter(id => !wellFormed(id))).toEqual([]);
  });
});

/** A tool whose one view lists what the test says, each row leading to a thing of its own. */
function listing(rows: () => readonly ViewRow[]): Tool {
  return {
    id: "list",
    name: "Lista",
    place: { key: "l", section: "tools" },
    summary: () => "",
    view: target => (target === undefined ? [{ title: "Cosas", rows: rows() }] : [{ title: "Cosa", rows: [] }]),
    acts: {},
  };
}
const at: Session = [
  { kind: "menu", at: 0 },
  { kind: "view", tool: "list", at: 0 },
];
const idsOn = (tools: readonly Tool[]): ReadonlyMap<string, string | undefined> =>
  new Map(rowsOf(resolve(at, tools, bar, { rows: 40 })).map(row => [row.title, row.id]));

describe("the identity of a row, by hand", () => {
  it("stays with a row that moved down", () => {
    const shown = ["a", "b"];
    const tools = [listing(() => shown.map(title => ({ title, opens: title })))];
    const before = idsOn(tools);
    shown.unshift("x");
    const after = idsOn(tools);
    expect(after.get("a")).toBe(before.get("a"));
    expect(after.get("b")).toBe(before.get("b"));
    expect(after.get("x")).not.toBe(after.get("a"));
  });
  it("tells apart two rows that open the same thing by which of the equals each is", () => {
    const tools = [
      listing(() => [
        { title: "a", opens: "a" },
        { title: "también a", opens: "a" },
      ]),
    ];
    const ids = idsOn(tools);
    expect(JSON.parse(ids.get("a") ?? "")).toEqual(["view", "list", "a"]);
    expect(JSON.parse(ids.get("también a") ?? "")).toEqual(["view", "list", "a", 2]);
  });
  it("is a defect when it would be longer than the limit: the defect screen, never a cut id", () => {
    const long = "x".repeat(rowIdLimit);
    const reported: unknown[] = [];
    const router = startRouter({
      tools: [listing(() => [{ title: "larga", opens: long }])],
      bar: () => bar,
      first: at,
      defect: error => {
        reported.push(error);
        return "falló";
      },
    });
    const screen = router.screen({ rows: 40 });
    router.stop();
    expect(screen.title).toBe(surfaceTexts.error.es);
    expect(String(reported[0])).toContain(`over ${rowIdLimit}`);
  });
});
/** The screen of the errands with the cursor moved down so many times. */
async function errandsDown(times: number): Promise<Screen> {
  const tools = fresh();
  const keys: readonly Intent[] = [
    { kind: "type", text: "e" },
    ...Array.from({ length: times }, (): Intent => ({ kind: "down" })),
  ];
  return resolve(await replayed(tools, keys), tools, bar, { rows: 40 });
}
describe("the identity of a control that shows where one writes", () => {
  it("is gone while the cursor stands on it, being written in, and the bank finds nothing wrong", async () => {
    const screens = await Promise.all([0, 1, 2, 3].map(errandsDown));
    const writing = screens.flatMap(screen => rowsOf(screen).filter(row => row.selected && row.entry));
    expect(writing.length).toBeGreaterThan(0);
    expect(writing.map(row => [row.title, row.id])).toEqual(writing.map(() => ["Nota", undefined]));
    expect(screens.flatMap(screen => pieceRules(screen, piecesOf(screen)))).toEqual([]);
    const resting = screens.flatMap(screen => rowsOf(screen).filter(row => row.title === "Nota" && !row.selected));
    expect(resting.map(row => row.id)).toEqual(resting.map(() => JSON.stringify(["press", "Pendientes", "Nota"])));
  });
});
