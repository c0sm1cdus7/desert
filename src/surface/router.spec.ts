// The router is the one place where a surface meets a house: every renderer gets the same screens and the same moves.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { object } from "../catalogs/acts.ts";
import { redrawMs } from "../catalogs/time.ts";
import { programAct, type ProgramTool } from "../tools/promises.ts";
import type { ActResult } from "../tools/tool-contract.ts";
import { houseRouter } from "./bridge/house-router.ts";
import type { Screen } from "./contract.ts";
import type { Router } from "./router.ts";
import { shopRig } from "../../tests/support/shop-rig.ts";
import { shopRegistry, shopShown, type Shop } from "../../tests/support/shop.ts";

const closing: { close?(): void; stop?(): void }[] = [];
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
});
afterEach(() => {
  closing.splice(0).forEach(open => (open.stop ?? open.close)?.());
  vi.useRealTimers();
});
let finish: (result: ActResult<Shop>) => void = () => {};
const nothing = object({});
/** A tool whose act ends when the test says so: its one case stands for the promise, the test drives the wait. */
const waiting = { promise: "it ends when it is told to", input: {}, then: { says: "Finished later", facts: [] } };
const slow: ProgramTool<Shop> = {
  id: "slow",
  purpose: "A tool of the test.",
  targets: () => [],
  view: () => "",
  summary: () => "",
  acts: {
    run: programAct<Shop, typeof nothing>({
      name: "correr",
      enter: "correr",
      undoable: false,
      purpose: "tarda lo que la prueba diga",
      key: "c",
      on: "tool",
      input: nothing,
      run: () => new Promise<ActResult<Shop>>(resolve => (finish = resolve)),
      cases: [waiting],
    }),
    fail: programAct<Shop, typeof nothing>({
      name: "fallar",
      enter: "fallar",
      undoable: false,
      purpose: "falla siempre",
      key: "f",
      on: "tool",
      input: nothing,
      run: () => Promise.reject(new Error("no paper")),
      cases: [waiting],
    }),
  },
};
const slowWords = { name: "Lento", key: "l", empty: "", listed: "Hoy", shown: "Datos", reads: {} };
const open = () => {
  const rig = shopRig({ registry: [...shopRegistry, slow] });
  const router = houseRouter(rig.ports("ana"), { ...shopShown, words: { ...shopShown.words, slow: slowWords } });
  closing.push(router, rig);
  return { rig, router };
};
const view = { rows: 20 };
const rowsOf = (screen: Screen): readonly string[] =>
  screen.body.kind === "list" ? screen.body.stacks.flatMap(stack => stack.rows.map(row => row.title)) : [];
const said = (screen: Screen): string => JSON.stringify(screen.body);
/** The surface attends before it acts: the slow act has started once those answers have gone by. */
const started = async (): Promise<void> => {
  for (let turn = 0; turn < 20; turn++) await Promise.resolve();
};
const key = (router: Router, ...keys: string[]): void => keys.forEach(text => router.send({ kind: "type", text }));

describe("the router", () => {
  it("gives every renderer the same screen, and tells each one when the house changed", () => {
    const { rig, router } = open();
    const first = vi.fn();
    const second = vi.fn();
    const stop = router.watch(first);
    router.watch(second);
    expect(router.screen(view)).toEqual(router.screen(view));
    rig.attend("beto", "sales");
    rig.act("beto", "register", { sale: "s1", total: 10 }, "sales");
    expect(first).toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(first.mock.calls.length);
    stop();
    const before = first.mock.calls.length;
    rig.act("beto", "register", { sale: "s2", total: 10 }, "sales");
    expect(first).toHaveBeenCalledTimes(before);
    expect(second.mock.calls.length).toBeGreaterThan(before);
  });

  it("moves by keys alone, and shows a running act until the house answers", async () => {
    const { router } = open();
    const changed = vi.fn();
    router.watch(changed);
    key(router, "l");
    expect(router.screen(view).title).toBe("Lento");
    expect(rowsOf(router.screen(view))).toEqual(["correr", "fallar"]);
    key(router, "c");
    router.send({ kind: "confirm" });
    expect(router.screen(view).title).toBe("Lento"); // Enter on a confirmation goes back: running it is chosen.
    key(router, "c", "c");
    expect(said(router.screen(view))).toContain("Procesando");
    await started();
    changed.mockClear();
    finish({ status: "accepted", text: "Finished later" });
    await router.idle();
    expect(said(router.screen(view))).toContain("Finished later");
    expect(changed).toHaveBeenCalled();
  });

  it("lands an act that fails as its reason on the screen, never as a house that stops", async () => {
    const { router } = open();
    key(router, "l", "f", "f");
    await router.idle();
    expect(said(router.screen(view))).toContain("no paper");
    for (let step = 0; step < 4; step++) router.send({ kind: "cancel" });
    expect(router.screen(view).title).toBe("Menú");
  });

  it("draws again as time passes, and stops for good when it is stopped", () => {
    const { rig, router } = open();
    const changed = vi.fn();
    router.watch(changed);
    vi.advanceTimersByTime(redrawMs * 3);
    expect(changed).toHaveBeenCalledTimes(3);
    router.stop();
    vi.advanceTimersByTime(redrawMs * 3);
    rig.attend("beto", "sales");
    expect(changed).toHaveBeenCalledTimes(3);
  });

  it("answers false only to the intent that leaves", () => {
    const { router } = open();
    expect(router.send({ kind: "type", text: "v" })).toBe(true);
    expect(router.screen(view).title).toBe("Ventas");
    expect(router.send({ kind: "menu" })).toBe(true);
    expect(router.screen(view).title).toBe("Menú");
    expect(router.send({ kind: "quit" })).toBe(false);
  });
});
