// A datum that an act changes, where a tool is its own settings: its row is where the act is taken from, saying
// what the datum is today. On a thing it is the other way: what is done to it is among its actions.
import { describe, expect, it } from "vitest";
import { houseTools } from "../surface/bridge/house-tools.ts";
import type { Screen } from "../surface/contract.ts";
import type { Composition } from "../tools/promises.ts";
import { localPorts } from "./house-runtime.ts";
import { goTo, seated, view } from "./promised-keys.ts";
import { prefer } from "./promised-off.ts";
import { cast, given, staged } from "./promised-stage.ts";
import { programChecks } from "./program-checks.ts";
import { astrayTill, closedTill, looseTill, tillProgram, tillShown, type Till } from "../../tests/support/till.ts";
import { looseStacksShown, stackedTillShown } from "../../tests/support/till.ts";

/** What a person reads of the till: each row by its key, what it says, its datum, and whether it is off. */
const read = ({ body }: Screen): string[] =>
  body.kind === "list"
    ? body.stacks
        .filter(stack => stack.title === "Caja")
        .flatMap(stack => stack.rows.map(row => [row.key, row.title, row.detail, row.off ? "off" : ""].join(" | ")))
    : [];
type Given = Parameters<typeof given>[2];
/** The till as ana has it in front, after what was done to it; and as she has it once she hides what cannot be done. */
const atTill = (done: Given, use: (now: () => string[], hide: () => Promise<void>) => Promise<void>) =>
  staged(tillProgram, async ({ house }) => {
    await given(house(), "till", done);
    const seat = seated(house(), cast.admin, tillShown);
    const hide = async (): Promise<void> => {
      seat.router.send({ kind: "menu" });
      await prefer(seat, "off", true);
      goTo(seat, "till", "till");
    };
    goTo(seat, "till", "till");
    await use(() => read(seat.router.screen(view)), hide).finally(() => seat.router.stop());
  });
const composed = (program: Composition<Till>) => () =>
  staged(program, ({ house }) => {
    houseTools(localPorts(house(), cast.admin, { recentLines: 100 }), tillShown);
    return Promise.resolve();
  });

describe("a program whose act changes a datum its tool reads", () => {
  for (const check of programChecks(tillProgram, tillShown)) it(check.name, check.run);

  it("takes the act from the row of that datum, with its key and what it is today: never among the actions", () =>
    atTill([], now => {
      expect(now()).toEqual(["f | fondo | $ 0 | "]);
      return Promise.resolve();
    }));

  it("opens the question on what the datum is today, lit whole: a key written replaces it, erasing edits it", () =>
    staged(tillProgram, async ({ house }) => {
      await given(house(), "till", [{ act: "float", input: { float: 500 } }]);
      const seat = seated(house(), cast.admin, tillShown);
      const entry = () => {
        const { body } = seat.router.screen(view);
        return body.kind === "thread" ? body.entry : undefined;
      };
      goTo(seat, "till", "till");
      seat.router.send({ kind: "type", text: "f" });
      const today = entry()?.typed ?? "";
      expect(today).toMatch(/5/u);
      expect(entry()?.suggested).toBe(true);
      seat.router.send({ kind: "type", text: "7" });
      expect(entry()?.suggested).toBeUndefined();
      expect(entry()?.typed).toMatch(/7/u);
      expect(entry()?.typed).not.toMatch(/5/u);
      seat.router.send({ kind: "cancel" });
      seat.router.send({ kind: "type", text: "f" });
      expect(entry()).toMatchObject({ typed: today, suggested: true });
      seat.router.send({ kind: "erase" });
      expect(entry()?.suggested).toBeUndefined();
      expect(entry()?.typed).not.toBe(today);
      expect(entry()?.typed).toMatch(/5/u);
      seat.router.stop();
    }));

  it("keeps saying the datum while it cannot be changed, and says why after it", () =>
    atTill([closedTill], now => {
      expect(now()).toEqual(["f | fondo | $ 0 · cerrada | off", " | Estado | cerrada | "]);
      return Promise.resolve();
    }));

  it("keeps the datum read for who prefers not to see what cannot be done: only the way to change it goes", () =>
    atTill([closedTill], async (now, hide) => {
      await hide();
      expect(now()).toEqual([" | fondo | $ 0 | ", " | Estado | cerrada | "]);
    }));

  it("refuses an act named as a datum that does not say it changes it, and one that changes what is not read", () =>
    Promise.all([
      expect(composed(looseTill)()).rejects.toThrow("float of till changes a datum its tool reads"),
      expect(composed(astrayTill)()).rejects.toThrow("float of till changes a datum its tool does not read: price"),
    ]));
});

/** What a person reads of the till in its stacks, between what calls and is new and its actions: each stack by its
 * title, its rows, and what it says with none. */
const stacks = ({ body }: Screen): unknown[] =>
  body.kind === "list"
    ? body.stacks
        .slice(2, -1)
        .map(stack => [
          stack.title,
          stack.rows.map(row => [row.key, row.title, row.detail].join(" | ")),
          stack.rows.length ? "" : stack.empty,
        ])
    : [];
const stacked = (done: Given, shown: typeof tillShown, use: (now: () => unknown[]) => void) =>
  staged(tillProgram, async ({ house }) => {
    await given(house(), "till", done);
    const seat = seated(house(), cast.admin, shown);
    goTo(seat, "till", "till");
    try {
      use(() => stacks(seat.router.screen(view)));
    } finally {
      seat.router.stop();
    }
  });

describe("a tool that reads data of its own, in the stacks its words say", () => {
  for (const check of programChecks(tillProgram, stackedTillShown)) it(check.name, check.run);

  it("puts each datum in its stack, the one an act changes as the row that starts it; a stack with none says so", () =>
    stacked([], stackedTillShown, now =>
      expect(now()).toEqual([
        ["Fondo", ["f | fondo | $ 0"], ""],
        ["Estado", [], "Abierta."],
      ]),
    ));

  it("reads under its label what no act changes", () =>
    stacked([closedTill], stackedTillShown, now =>
      expect(now()).toEqual([
        ["Fondo", ["f | fondo | $ 0 · cerrada"], ""],
        ["Estado", [" | Estado | cerrada"], ""],
      ]),
    ));

  it("refuses a datum the tool reads that no stack of its own holds", () =>
    staged(tillProgram, async ({ house }) => {
      await given(house(), "till", [closedTill]);
      const seat = seated(house(), cast.admin, looseStacksShown);
      try {
        seat.router.send({ kind: "type", text: tillShown.words.till?.key ?? "" });
        const screen = JSON.stringify(seat.router.screen(view));
        expect(screen).toContain("E-PROG-1");
        expect(screen).not.toContain("no stack");
        expect(seat.defects).toHaveLength(1);
        expect(JSON.stringify(house().tools.state().entries)).toContain(
          "till reads state and no stack of its presentation holds it",
        );
      } finally {
        seat.router.stop();
      }
    }));
});

it("fails derived walks for a tool with loose stacks", async () => {
  const checks = programChecks(tillProgram, looseStacksShown).filter(check => check.name.includes("by keys"));
  expect(checks.length).toBeGreaterThan(0);
  const failed: { name: string; error: unknown }[] = [];
  for (const check of checks) {
    try {
      await check.run();
    } catch (error) {
      failed.push({ name: check.name, error: error instanceof Error ? error.message : error });
    }
  }
  expect(failed).toEqual([
    {
      name: "till · float · a closed till keeps its float, by keys",
      error: "E-PROG-1 · Falló el programa · till/till",
    },
    { name: "till · close · the till is closed, by keys", error: "E-PROG-1 · Falló el programa · till/till" },
  ]);
});
