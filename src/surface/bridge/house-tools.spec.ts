// What a program cannot be shown with: it is refused when its tools are composed for a surface, before anyone uses it.
import { afterEach, describe, expect, it } from "vitest";
import { houseTools } from "./house-tools.ts";
import type { Shown } from "./house-ports.ts";
import { stacksOf } from "../lists.ts";
import type { Picture } from "../screen.ts";
import { must } from "../window.ts";
import type { ProgramAct, ProgramTool } from "../../tools/promises.ts";
import type { ToolRegistry } from "../../tools/tool-contract.ts";
import { shopRig } from "../../../tests/support/shop-rig.ts";
import { paymentsTool, salesTool, shopShown, shopWords, type Shop } from "../../../tests/support/shop.ts";

const closing: { close(): void }[] = [];
afterEach(() => closing.splice(0).forEach(open => open.close()));
const composed = (registry: ToolRegistry<Shop>, shown: Shown<Shop> = shopShown) => {
  const rig = shopRig({ registry });
  closing.push(rig);
  return () => houseTools(rig.ports("ana"), shown);
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
      ["payments", "p", ["receive"]],
      ["preferences", ",", ["off", "foreign", "empty"]],
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

  it("opens a tool that lives in another from that one, never from the Menu, and tells them apart by key there", () => {
    const inSales = { ...must(shopWords.payments), inside: "sales" };
    const nested: Shown<Shop> = { ...shopShown, words: { ...shopWords, payments: inSales } };
    const tools = composed([salesTool, paymentsTool], nested)();
    expect(tools.map(tool => [tool.id, tool.place.section, tool.place.inside])).toEqual([
      ["sales", "tools", undefined],
      ["payments", "hidden", "sales"],
      ["preferences", "system", undefined],
    ]);
    const titles = (place: Picture): string[] => stacksOf(place, tools).map(stack => stack.title);
    const keysOf = (place: Picture, title: string): unknown[] =>
      stacksOf(place, tools).flatMap(stack => (stack.title === title ? stack.rows.map(row => row.key) : []));
    expect(keysOf({ kind: "menu", at: 0 }, "Herramientas")).toEqual(["v"]);
    expect(titles({ kind: "view", tool: "sales", at: 0 })).toContain("Herramientas");
    expect(keysOf({ kind: "view", tool: "sales", at: 0 }, "Herramientas")).toEqual(["p"]);
    const astray = { ...shopWords, payments: { ...inSales, inside: "nowhere" } };
    expect(composed([salesTool, paymentsTool], { ...shopShown, words: astray })).toThrow("which is not a tool");
    const clash = { ...shopWords, payments: { ...inSales, key: "r" } };
    expect(composed([salesTool, paymentsTool], { ...shopShown, words: clash })).toThrow("Two rows of sales take");
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
});
