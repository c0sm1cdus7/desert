// The test shop with a menu on its sales: what a sale says is corrected from there, opening on what it is today.
import { object } from "../../src/fields/visible-text.ts";
import { money } from "../../src/fields/fields.ts";
import { anyToolScreen } from "../../src/surface/bridge/views/any-tool.ts";
import { section, type ProgramScreen, type Start } from "../../src/surface/bridge/ports/house-ports.ts";
import { menuTarget } from "../../src/surface/bridge/acts/program-acts.ts";
import type { ViewRow } from "../../src/surface/contract/shown-tool.ts";
import { toolTexts } from "../../src/texts/tools.texts.ts";
import { programAct } from "../../src/tools/promises.ts";
import type { State } from "../../src/tools/tool-contract.ts";
import { ars, shop, type Shop } from "./shop.ts";
import { shopWith, shownWith } from "./shop-variants.ts";

const corrected = object({ total: money("Total"), paid: money("Cobrado") });
const nameOf = (target: string): string => target.replace("sales/", "");
const todayOf = (state: State<Shop>, target: string) => {
  const sale = state.tools.sales.get(nameOf(target));
  return sale && { total: sale.total, paid: sale.paid };
};
export const registered = { act: "register", input: { sale: "s1", total: 1500 } };
const told = (total: number, paid: number) => ({
  says: "Corregida · s1",
  facts: [{ kind: "sale-corrected" as const, data: { sale: "s1", total, paid } }],
  reads: { lines: [{ total: ars(total), paid: ars(paid), by: "ana" }] },
});
export const totalCorrected = "sales · correct · a sale's total is corrected, and what it was paid stays";
export const paidCorrected = "sales · correct · what a sale was paid is corrected, and its total stays";
export const overpaid = "sales · correct · a sale is not paid more than its total";
export const saidAgain = "sales · correct · a sale said again as it is changes nothing";
/** Correcting a sale says its total and what it was paid over again: a person changes one, and the other stays. */
const correct = programAct<Shop, typeof corrected>({
  name: "corregir",
  enter: "corregir",
  undoable: true,
  purpose: "lo que la venta dice",
  key: "c",
  on: "thing",
  under: "edit",
  input: corrected,
  today: todayOf,
  refuses: ["overpaid", toolTexts.unchanged],
  stops: ({ paid, total }) =>
    typeof paid === "number" && typeof total === "number" && paid > total ? "overpaid" : undefined,
  run: (input, { by, target }) => {
    const fact = shop.fact("sale-corrected", { sale: nameOf(target), ...input }, by);
    return { status: "accepted", text: `Corregida · ${nameOf(target)}`, effects: [fact] };
  },
  cases: [
    {
      promise: "a sale's total is corrected, and what it was paid stays",
      given: [registered],
      on: "sales/s1",
      input: { total: 2000, paid: 0 },
      then: told(2000, 0),
    },
    {
      promise: "what a sale was paid is corrected, and its total stays",
      given: [registered],
      on: "sales/s1",
      input: { total: 1500, paid: 500 },
      then: told(1500, 500),
    },
    {
      promise: "a sale is not paid more than its total",
      given: [registered],
      on: "sales/s1",
      input: { total: 1500, paid: 2000 },
      then: { refused: "overpaid" },
    },
    {
      promise: "a sale said again as it is changes nothing",
      given: [registered],
      on: "sales/s1",
      input: { total: 1500, paid: 0 },
      then: { refused: toolTexts.unchanged },
    },
  ],
});
const edit = { name: "editar", purpose: "total y cobrado", key: "e" };
export const correctingShop = shopWith({ sales: { menus: { edit }, acts: { correct } } });
/** The thing a destination is a part of, when it ends as that part does. */
const under = (target: string | undefined, part: string): string | undefined =>
  target?.endsWith(part) ? target.slice(0, -part.length) : undefined;
const partsOf = (thing: string): string => `${menuTarget(thing, "edit")}/parts`;
type Rows = (start: Start, thing: string, today: ReturnType<typeof todayOf>) => ViewRow[];
/** A screen whose Edit menu leads to another menu, where each part of the sale is asked alone. */
const parted =
  (rows: Rows, fragile = false): ProgramScreen<Shop> =>
  (ports, tool, words, acts, start) => {
    const plain = anyToolScreen(ports, tool, words, acts, start);
    return {
      ...plain,
      titleOf: target => (under(target, "#edit/parts") ? "Partes" : (plain.titleOf?.(target) ?? target)),
      view: target => {
        const menu = under(target, "#edit");
        const parts = under(target, "#edit/parts");
        if (menu) return [section("Editar", [{ key: "p", title: "Partes", opens: partsOf(menu) }])];
        /** A fragile menu of parts is there only while nothing was paid: once something is, it no longer exists. */
        if (parts && fragile && (todayOf(ports.state(), parts)?.paid ?? 0) > 0) throw new Error(`no parts of ${parts}`);
        if (parts) return [section("Partes", rows(start, parts, todayOf(ports.state(), parts)))];
        return plain.view(target);
      },
    };
  };
const total = { asks: [0, 1], key: "t", title: "total" } as const;
const paid = { asks: [1, 2], key: "b", title: "cobrado" } as const;
const honest: Rows = (start, thing, today) => [
  start("correct", thing, { ...total, today }),
  start("correct", thing, { ...paid, today }),
];
/** The same menus, with a row that says the sale was paid what it was not: what it does not ask is not today's. */
const stale: Rows = (start, thing, today) => [
  start("correct", thing, { ...total, today: today && { ...today, paid: 999 } }),
  start("correct", thing, { ...paid, today }),
];
/** The same menus, whose rows name themselves as labels do, with a capital: a row that starts an act is no label. */
const shouting: Rows = (start, thing, today) => [
  start("correct", thing, { ...total, title: "Total", today }),
  start("correct", thing, { ...paid, title: "Cobrado", today }),
];
/** The same menus, with two rows that take one key. */
const twins: Rows = (start, thing, today) => honest(start, thing, today).map(row => ({ ...row, key: "t" }));
export const partsShown = shownWith({ sales: parted(honest) });
export const staleShown = shownWith({ sales: parted(stale) });
export const twinsShown = shownWith({ sales: parted(twins) });
export const shoutingShown = shownWith({ sales: parted(shouting) });
/** A screen whose Edit menu lists nothing: the act under it is declared, and no list a person reaches has it. */
export const lostShown = shownWith({ sales: parted(() => []) });
/** The parts menu goes away once the sale was paid something: correcting what was paid takes its own menu away. */
export const fragileShown = shownWith({ sales: parted(honest, true) });
/** The same shop, whose correcting says that it may take away the menu it was taken from. */
export const leavingCorrect = shopWith({ sales: { menus: { edit }, acts: { correct: { ...correct, leaves: true } } } });
