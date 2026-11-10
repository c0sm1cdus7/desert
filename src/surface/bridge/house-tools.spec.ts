// What a program cannot be shown with: it is refused when its tools are composed for a surface, before anyone uses it.
import { afterEach, describe, expect, it } from "vitest";
import { houseTools } from "./house-tools.ts";
import type { Shown } from "./house-ports.ts";
import { must } from "../window.ts";
import type { ProgramAct } from "../../tools/promises.ts";
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
    ]);
  });

  it("refuses a tool without words, and two tools that take the same key", () => {
    const onlySales = { sales: must(shopWords.sales) };
    expect(composed([salesTool, paymentsTool], { ...shopShown, words: onlySales })).toThrow(
      "No words for the tools payments",
    );
    const words = { ...onlySales, payments: { ...must(shopWords.payments), key: "v" } };
    expect(composed([salesTool, paymentsTool], { ...shopShown, words })).toThrow("Two tools take the same key: v");
  });

  it("refuses an act without its declaration, two acts in one place with one key, the key that goes back", () => {
    const { label: _label, ...bare } = register;
    expect(composed([{ ...salesTool, acts: { register: bare } }, paymentsTool])).toThrow(
      "Acts without their declaration in sales",
    );
    expect(composed(sales({ register, again: register }))).toThrow("Two acts of sales take the same key: r");
    expect(composed(sales({ register: { ...register, key: "v" } }))).toThrow(
      "An act of sales takes the key that goes back: v",
    );
    expect(composed(sales({ register, onEach: { ...register, on: "thing" } }))).not.toThrow();
  });
});
