// What a program cannot be shown with: it is refused when its tools are composed for a surface, before anyone uses it.
import { afterEach, describe, expect, it } from "vitest";
import { object } from "../../../fields/visible-text.ts";
import { day, text, thing } from "../../../fields/fields.ts";
import { houseTools } from "./house-tools.ts";
import type { Shown } from "../ports/house-ports.ts";
import { stacksOf } from "../../menus/lists.ts";
import { must } from "../../session/window.ts";
import type { ProgramAct, ProgramTool } from "../../../tools/promises.ts";
import type { ToolRegistry } from "../../../tools/tool-contract.ts";
import { shopRig, testTime } from "../../../../tests/support/shop-rig.ts";
import { paymentsTool, salesTool, shopShown, shopWords, type Shop } from "../../../../tests/support/shop.ts";
import { program as gate, shown as gateShown } from "../../../../tests/support/shop-program.ts";

const closing: { close(): void }[] = [];
afterEach(() => closing.splice(0).forEach(open => open.close()));
const composed = (registry: ToolRegistry<Shop>, shown: Shown<Shop> = shopShown) => {
  const rig = shopRig({ registry });
  closing.push(rig);
  return () =>
    houseTools(
      rig.ports("ana", () => testTime.now()),
      shown,
    );
};
const register = must(salesTool.acts.register);
const sales = (acts: Readonly<Record<string, ProgramAct<Shop>>>): ToolRegistry<Shop> => [
  { ...salesTool, acts },
  paymentsTool,
];

describe("a program's tools, composed for a surface", () => {
  it("shows every tool the program declares, each with its acts", () => {
    const tools = composed([salesTool, paymentsTool])();
    expect(tools.map(tool => [tool.id, tool.place.key, Object.keys(tool.acts)])).toEqual([
      ["sales", "v", ["register"]],
      ["payments", "p", ["receive", "notice"]],
      ["preferences", ",", ["off", "foreign", "empty", "language"]],
    ]);
  });

  it("lists every tool on the Menu, the gate's sample too: no tool lives inside another", () => {
    const tools = composed(gate.registry, gateShown)();
    const programs = stacksOf({ kind: "menu", at: 0 }, tools).find(stack => stack.title === "Programas");
    expect(programs?.rows.map(row => [row.title, row.key])).toEqual([
      ["ventas", "v"],
      ["pagos", "p"],
      ["muestra", "m"],
    ]);
    expect(tools.map(tool => [tool.id, tool.place])).toContainEqual(["sample", { key: "m", section: "tools" }]);
  });

  it("lists on the Menu a tool whose words still say the retired `inside`", () => {
    const saying = Object.assign({}, must(shopWords.payments), { inside: "sales" });
    const tools = composed([salesTool, paymentsTool], { ...shopShown, words: { ...shopWords, payments: saying } })();
    const programs = stacksOf({ kind: "menu", at: 0 }, tools).find(stack => stack.title === "Programas");
    expect(programs?.rows.map(row => [row.title, row.key])).toEqual([
      ["ventas", "v"],
      ["pagos", "p"],
    ]);
  });

  it("refuses a tool without words, and two tools that take the same key", () => {
    const onlySales = { sales: must(shopWords.sales) };
    expect(composed([salesTool, paymentsTool], { ...shopShown, words: onlySales })).toThrow(
      "No words for the tools payments",
    );
    const words = { ...onlySales, payments: { ...must(shopWords.payments), key: "v" } };
    expect(composed([salesTool, paymentsTool], { ...shopShown, words })).toThrow("Two tools take the same key: v");
    const comma = { ...onlySales, payments: { ...must(shopWords.payments), key: "," } };
    expect(composed([salesTool, paymentsTool], { ...shopShown, words: comma })).toThrow("the same key: ,");
    const named = { ...salesTool, id: "preferences" };
    const itsWords = { ...shopWords, preferences: must(shopWords.sales) };
    expect(composed([named, paymentsTool], { ...shopShown, words: itsWords })).toThrow("takes the name of Preferences");
  });

  it("refuses an act without its declaration, two acts in one place with one key, the key that goes back", () => {
    const { name: _name, ...bare } = register;
    expect(composed([{ ...salesTool, acts: { register: bare } }, paymentsTool])).toThrow(
      "Acts without their declaration in sales",
    );
    expect(composed(sales({ register, again: register }))).toThrow("Two acts of sales take the same key: r");
    expect(composed(sales({ register: { ...register, enter: "vender" } }))).toThrow(
      "The verb of an act of sales starts with the key that goes back: v",
    );
    expect(composed(sales({ register, onEach: { ...register, on: "thing" } }))).not.toThrow();
  });

  it("refuses an act under a menu its tool does not declare, a menu with nothing under it, a key taken twice", () => {
    const menus = { edit: { name: "editar", purpose: "total y cobrado", key: "e" } };
    const menued = (acts: Readonly<Record<string, ProgramAct<Shop>>>): ToolRegistry<Shop> => {
      const tool: ProgramTool<Shop> = { ...salesTool, menus, acts };
      return [tool, paymentsTool];
    };
    const inMenu = { ...register, on: "thing", under: "edit" } as const;
    expect(composed(sales({ register, inMenu }))).toThrow("under menus it does not declare: edit");
    expect(composed(menued({ register }))).toThrow("have no act of a thing under them: edit");
    const beside = { ...register, on: "thing", key: "e" } as const;
    expect(composed(menued({ register, inMenu, beside }))).toThrow("Two acts of sales take the same key: e");
    expect(composed(menued({ register, inMenu, also: inMenu }))).toThrow("Two acts of sales take the same key: r");
    expect(composed(menued({ register, inMenu }))).not.toThrow();
  });

  it("refuses a day held to today where the program does not say what day it is, and a thing made by no act", () => {
    const dated = { ...register, input: object({ sale: text("Venta", "Venta"), on: day("Día", "today") }) };
    expect(composed(sales({ register: dated }))).toThrow("holds a day to today and the program does not say what day");
    const plain = { ...register, input: object({ on: day("Día") }) };
    expect(composed(sales({ register: plain }))).toThrow("program does not say what day");
    const told = { ...shopShown, day: () => "2026-11-12" };
    expect(composed(sales({ register: plain }), told)).not.toThrow();
    expect(composed(sales({ register: dated }), told)).not.toThrow();
    const making = { ...register, input: object({ sale: thing("Venta", "sales", undefined, "open") }) };
    expect(composed(sales({ register: making }))).toThrow("makes a thing with an act that makes none: open");
  });
});
