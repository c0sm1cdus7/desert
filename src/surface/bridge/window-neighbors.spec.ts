// Cache lifetime, absence and mixed readings around the recent-window guarantee.
import { afterEach, expect, it } from "vitest";
import { windowShop } from "../../../tests/support/window-shop.ts";
import { anyToolScreen } from "./any-tool.ts";
import { houseTools } from "./house-tools.ts";
import { must } from "../window.ts";
import { MissingView } from "../navigation/missing-view.ts";
import { stacksOf } from "../lists.ts";
import { effect } from "../../journal/events.ts";
import { shop } from "../../../tests/support/shop.ts";
const seats: ReturnType<typeof windowShop>[] = [];
const seat = () => {
  const hands = windowShop();
  seats.push(hands);
  return hands;
};
afterEach(() => seats.splice(0).forEach(each => each.close()));
it("refreshes an old row after an event and after replay of already written facts", () => {
  const hands = seat();
  expect(hands.sale.find?.("antigua")[0]?.detail).toBe("$ 15,00");
  hands.rig.bus.emit(shop.fact("sale-corrected", { sale: "s1", total: 2000, paid: 0 }, "beto"));
  expect(hands.sale.find?.("antigua")[0]?.detail).toBe("$ 20,00");
  hands.rig.restart();
  expect(hands.sale.titleOf?.("sales/s1")).toBe("s1");
  expect(hands.sale.find?.("antigua")[0]?.detail).toBe("$ 20,00");
});
it("does not turn a missing thing or an incomplete full reading into an invented name", () => {
  const hands = seat();
  expect(() => hands.sale.titleOf?.("sales/missing")).toThrow("a required value is missing");
  expect(() => hands.sale.view("sales/missing")).toThrow(MissingView);
  const tool = { ...hands.sales, view: () => "" };
  const ports = { ...hands.ports, act: () => ({ status: "accepted", effects: [] }) as const };
  const screen = anyToolScreen(ports, tool, must(hands.shown.words.sales), { acts: {} }, () => ({ title: "" }));
  expect(() => screen.titleOf?.("sales/s1")).toThrow("a required value is missing");
});
it("keeps tool data separate from the full index of its objects", () => {
  const hands = seat();
  const tool = {
    ...hands.sales,
    view: (...args: Parameters<typeof hands.sales.view>) =>
      `${JSON.stringify({ count: 41 })}\n${hands.sales.view(...args)}`,
  };
  const words = {
    ...must(hands.shown.words.sales),
    itself: [{ title: "Resumen", empty: "", reads: { count: "Cantidad" } }],
  };
  const ports = { ...hands.ports, act: () => ({ status: "accepted", effects: [] }) as const };
  const screen = anyToolScreen(ports, tool, words, { acts: {} }, () => ({ title: "" }));
  expect(screen.titleOf?.("sales/s1")).toBe("s1");
  expect(screen.find?.("Cantidad")).toEqual([]);
  expect(screen.view()[0]?.rows).toEqual([{ title: "Cantidad", detail: "41", still: true }]);
});
it("names a reference to an old object even when its tool is not held", () => {
  const hands = seat();
  hands.rig.bus.emit(effect("granted", { identity: "beto", tools: ["payments"] }, "ana"));
  const ports = { ...hands.rig.ports("beto", () => 1), limits: { recentLines: 40 } };
  const tools = houseTools(ports, hands.shown);
  const rows = stacksOf({ kind: "view", tool: "payments", at: 0 }, tools).flatMap(stack => stack.rows);
  const link = rows.find(row => row.title === "Primera venta")?.open;
  expect(link).toEqual({ kind: "view", tool: "sales", target: "sales/s1", at: 0 });
});
it("reuses one full reading for titles and searches until the state or instant changes", () => {
  const hands = seat();
  hands.reads.splice(0);
  expect(hands.sale.titleOf?.("sales/s1")).toBe("s1");
  expect(hands.sale.find?.("antigua")).toHaveLength(1);
  expect(hands.sale.titleOf?.("sales/s2")).toBe("s2");
  expect(hands.reads).toEqual([Number.MAX_SAFE_INTEGER]);
  hands.add(42);
  expect(hands.sale.titleOf?.("sales/s42")).toBe("s42");
  expect(hands.reads).toEqual([Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER]);
});
it("renames and removes an indexed old object when a new state replaces it", () => {
  const hands = seat();
  let state = hands.ports.state();
  let name = "Primera";
  const tool = {
    ...hands.sales,
    view: (...args: Parameters<typeof hands.sales.view>) =>
      hands.sales.view(...args).replace('"text":"s1"', `"text":"${name}"`),
  };
  const ports = { ...hands.ports, state: () => state, act: () => ({ status: "accepted", effects: [] }) as const };
  const screen = anyToolScreen(ports, tool, must(hands.shown.words.sales), { acts: {} }, () => ({ title: "" }));
  expect(screen.titleOf?.("sales/s1")).toBe("Primera");
  name = "Renombrada";
  state = { ...state, through: state.through + 1 };
  expect(screen.titleOf?.("sales/s1")).toBe("Renombrada");
  const sales = new Map(state.tools.sales);
  sales.delete("s1");
  state = { ...state, tools: { ...state.tools, sales } };
  expect(() => screen.titleOf?.("sales/s1")).toThrow("a required value is missing");
  expect(() => screen.view("sales/s1")).toThrow(MissingView);
});
it("refreshes names when the clock advances without a new fact", () => {
  const hands = seat();
  let now = 1;
  const ports = { ...hands.ports, now: () => now, act: () => ({ status: "accepted", effects: [] }) as const };
  const tool = {
    ...hands.sales,
    view: (...args: Parameters<typeof hands.sales.view>) =>
      hands.sales.view(...args).replace('"text":"s1"', `"text":"Día ${args[2].now}"`),
  };
  const screen = anyToolScreen(ports, tool, must(hands.shown.words.sales), { acts: {} }, () => ({ title: "" }));
  expect(screen.titleOf?.("sales/s1")).toBe("Día 1");
  now = 2;
  expect(screen.titleOf?.("sales/s1")).toBe("Día 2");
});
it("retries a failed full reading instead of keeping a partial index", () => {
  const hands = seat();
  let broken = true;
  const tool = {
    ...hands.sales,
    view: (...args: Parameters<typeof hands.sales.view>) => {
      if (broken) throw new Error("lectura interrumpida");
      return hands.sales.view(...args);
    },
  };
  const ports = { ...hands.ports, act: () => ({ status: "accepted", effects: [] }) as const };
  const screen = anyToolScreen(ports, tool, must(hands.shown.words.sales), { acts: {} }, () => ({ title: "" }));
  expect(() => screen.titleOf?.("sales/s1")).toThrow("lectura interrumpida");
  broken = false;
  expect(screen.titleOf?.("sales/s1")).toBe("s1");
});
it("finds and opens an unheld tool and its old objects even when foreign tools are hidden", () => {
  const hands = seat();
  hands.rig.bus.emit(effect("granted", { identity: "beto", tools: ["payments"] }, "ana"));
  hands.rig.act("beto", "prefer", { hide: "foreign", on: true });
  const tools = houseTools({ ...hands.rig.ports("beto", () => 1), limits: { recentLines: 40 } }, hands.shown);
  const menu = stacksOf({ kind: "menu", at: 0 }, tools).flatMap(stack => stack.rows);
  expect(menu.some(row => row.key === "v")).toBe(false);
  const find = (text: string) => stacksOf({ kind: "menu", at: 0, find: text }, tools).flatMap(stack => stack.rows);
  expect(find("ventas").some(row => row.open?.kind === "view" && row.open.tool === "sales")).toBe(true);
  expect(find("antigua").some(row => row.open?.kind === "view" && row.open.target === "sales/s1")).toBe(true);
  const rows = stacksOf({ kind: "view", tool: "sales", at: 0 }, tools).flatMap(stack => stack.rows);
  expect(rows).toContainEqual(expect.objectContaining({ key: "r", off: true, detail: "fuera del kit" }));
});
it("reads activity and chooses an unheld old object after reopening", () => {
  const hands = seat();
  hands.rig.bus.emit(effect("granted", { identity: "beto", tools: ["payments"] }, "ana"));
  hands.rig.bus.emit(
    effect(
      "tool-entry",
      {
        tool: "sales",
        target: "sales/s1",
        author: "ana",
        text: "Revisada",
        attention: false,
      },
      "ana",
    ),
  );
  hands.rig.act("beto", "prefer", { hide: "foreign", on: true });
  hands.rig.restart();
  const tools = houseTools({ ...hands.rig.ports("beto", () => 1), limits: { recentLines: 40 } }, hands.shown);
  const menu = stacksOf({ kind: "menu", at: 0 }, tools);
  expect(menu.find(stack => stack.title === "Actividad")?.rows).toContainEqual(
    expect.objectContaining({ title: "Revisada", opens: "sales/s1" }),
  );
  expect(menu.find(stack => stack.title === "Atención")?.rows ?? []).toEqual([]);
  const pick = tools.find(tool => tool.id === "payments")?.acts.pay?.next([]);
  expect(pick?.kind).toBe("pick");
  if (pick?.kind !== "pick") throw new Error("expected a picker");
  expect(pick.valid?.("sales/s1")).toBe(true);
  expect(pick.found("antigua")).toContainEqual(expect.objectContaining({ value: "sales/s1" }));
});
