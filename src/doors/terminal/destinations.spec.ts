// One destination, one picture: an act cannot name a destination it does not have, and what is missing says so.
import { describe, expect, expectTypeOf, it } from "vitest";
import { rulesTool, seed } from "../../../tests/support/surface-rules.ts";
import type { Field, Option, Screen, ThreadEvent } from "../../surface/contract.ts";
import type { ThingAct, Tool, ToolAct } from "../../surface/shown-tool.ts";
import { resolve } from "../../surface/resolve.ts";
import { actOf, start, type Done, type Running, type Session, type Walk } from "../../surface/screen.ts";
import { finished, settled, step } from "../../surface/step.ts";
import { bytesOf, textOf } from "./cells.ts";
import { keysOf } from "./input.ts";
import { contentRows, paint } from "./paint.ts";

const size = { cols: 106, rows: 30 };
const bar = { state: "connected", clock: "14:32", now: 5_000 } as const;
const shown = (session: Session, tools: readonly Tool[]): string =>
  textOf(paint(resolve(session, tools, bar, { rows: contentRows(size.rows) }), size)).join("\n");
async function press(session: Session, keys: string, tools: readonly Tool[]): Promise<Session> {
  let now = session;
  for (const key of keysOf(keys)) {
    const stepped = step(now, key, tools, bar.now);
    now = stepped.session;
    if (stepped.run) now = finished(now, stepped.run, await actOf(tools, stepped.run).run(stepped.run.answers));
  }
  return now;
}
const walk: Walk = {
  kind: "act",
  tool: "rules",
  act: "drop",
  target: "a",
  answers: [],
  asked: [],
  pos: 0,
  floor: 0,
  typed: "",
  caret: 0,
  at: 0,
  marks: [],
  suggested: false,
  phase: "asking",
};
describe("a destination", () => {
  it("lands on what listed it when you close what removed it", async () => {
    const tools = [rulesTool(seed())];
    const inside = await press(start, "r\r", tools);
    const closed = await press(inside, "le\x1b", tools);
    expect(shown(closed, tools)).toBe(shown(await press(start, "r", tools), tools));
    expect(shown(closed, tools)).toContain("Acciones");
  });
  it("says so when someone else removed it, and never draws another screen", async () => {
    const rules = seed();
    const tools = [rulesTool(rules)];
    const looking = await press(start, "r\r", tools);
    rules.splice(0, rules.length);
    expect(shown(looking, tools)).toContain("Error E-NAV-1 · Destino inexistente");
    expect(shown(looking, tools)).not.toContain("Tuyas");
    expect(shown(looking, tools)).toContain("esc volver");
    expect(shown(await press(looking, "\r", tools), tools)).toContain("Error E-NAV-1 · Destino inexistente");
    expect(shown(await press(looking, "\x1b", tools), tools)).toContain("Tuyas");
  });
  it("exists in the type: an act on the tool takes none, an act on a thing cannot go without one", () => {
    expectTypeOf<ToolAct["next"]>().parameters.toEqualTypeOf<[readonly string[]]>();
    expectTypeOf<ThingAct["next"]>().parameters.toEqualTypeOf<[readonly string[], string]>();
    expectTypeOf<ThingAct["run"]>().parameters.toEqualTypeOf<[readonly string[], string]>();
    expectTypeOf<ThingAct["leaves"]>().toEqualTypeOf<boolean>();
    expectTypeOf<Extract<Field, { options: unknown }>["options"]>().toEqualTypeOf<readonly Option[]>();
    expectTypeOf<Done["done"]>().toEqualTypeOf<string>();
    expectTypeOf<Running["since"]>().toEqualTypeOf<number>();
  });
  it("fails out loud when a walk or a view names what does not exist", () => {
    const tools = [rulesTool(seed())];
    const { target: _target, ...withoutOne } = walk;
    expect(() => actOf(tools, { ...walk, act: "create" })).toThrow("a required value is missing");
    expect(() => actOf(tools, withoutOne)).toThrow("a required value is missing");
    expect(() => tools[0]?.view("nothing")).toThrow("rules has no nothing");
  });
});
it("ends a focused block in half a row with its corners cut, only where there is air for it", () => {
  const said = (selected: boolean) => ({
    head: [{ text: "Vos", tone: "t1" as const }],
    text: [{ text: "hola", tone: "t1" as const }],
    selected,
  });
  const screen = (events: readonly ThreadEvent[]): Screen => ({
    title: "Comunicador",
    state: "connected",
    clock: "12:00",
    hints: [],
    menu: false,
    body: { kind: "thread", events },
  });
  const lines = textOf(paint(screen([said(false), said(true), said(false)]), { cols: 80, rows: 24 }));
  expect(lines.filter(line => line.includes("▗▄"))).toHaveLength(1);
  expect(lines.filter(line => line.includes("▝▀"))).toHaveLength(1);
  const nested = { text: [{ text: "sigue", tone: "t1" as const }], nested: true };
  const tight = textOf(paint(screen([said(true), nested]), { cols: 80, rows: 24 }));
  expect(tight.some(line => line.includes("▗▄"))).toBe(false);
});

it("draws no control character from a text: a message cannot drive the terminal", () => {
  const event = { text: [{ text: "a\x1b]52;c;x\x07\u009bb", tone: "t1" as const }] };
  const screen: Screen = {
    title: "x",
    state: "connected",
    clock: "12:00",
    hints: [],
    menu: false,
    body: { kind: "thread", events: [event] },
  };
  const bytes = bytesOf(paint(screen, { cols: 80, rows: 24 }));
  expect(bytes).not.toContain("\x1b]52");
  expect(bytes).not.toContain("\x07");
  expect(bytes).not.toContain("\u009b");
});
it("draws a block as it was written: a line break in what is said starts a new line", () => {
  const block = "Factura A 0001-00000001\nLibrería Sol SRL\n2 × Café en grano     $ 9.000,00";
  const screen: Screen = {
    title: "x",
    state: "connected",
    clock: "12:00",
    hints: [],
    menu: false,
    body: { kind: "thread", events: [{ text: [{ text: block, tone: "t1" as const }] }] },
  };
  const lines = textOf(paint(screen, { cols: 80, rows: 24 })).map(line => line.trim());
  const first = lines.indexOf("Factura A 0001-00000001");
  expect(first).toBeGreaterThan(0);
  expect(lines.slice(first, first + 3)).toEqual([
    "Factura A 0001-00000001",
    "Librería Sol SRL",
    "2 × Café en grano     $ 9.000,00",
  ]);
});
describe("a message", () => {
  const talking = (answer: string | undefined): Tool => ({
    id: "talk",
    name: "Comunicador",
    place: { key: "c", section: "tools" },
    summary: () => "",
    view: () => [],
    acts: {},
    conversation: {
      said: () => [],
      live: () => null,
      send: () => Promise.resolve(answer),
      open: () => ({ title: "", lines: [] }),
    },
  });
  const typed = async (tools: readonly Tool[]): Promise<Session> => {
    let session: Session = [...start, { kind: "talk", tool: "talk", ...startTalkFields }];
    for (const key of keysOf("Hola\r")) {
      const stepped = step(session, key, tools, bar.now);
      session = stepped.session;
      const { sending } = stepped;
      if (sending) session = settled(session, sending, await sending);
    }
    return session;
  };
  const startTalkFields = { typed: "", caret: 0, at: -1, inPanel: false, full: false, top: 0, option: 0 };
  it("leaves the Entrada only once the house accepted it", async () => {
    expect(shown(await typed([talking(undefined)]), [talking(undefined)])).not.toContain("Hola");
  });
  it("stays written with its reason when the house refused it", async () => {
    const text = shown(await typed([talking("No enviado")]), [talking("No enviado")]);
    expect(text).toContain("Error No enviado");
    expect(text).toContain("› Hola");
  });
});
