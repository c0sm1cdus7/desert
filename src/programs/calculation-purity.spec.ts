import "../../tests/support/upgrade-vault.ts";
import { expect, it } from "vitest";
import { staged, perform } from "./promised-stage.ts";
import { shopSlices } from "../../tests/support/shop.ts";
import { program } from "../../tests/support/upgrade-support.ts";
import { frozenState } from "../journal/frozen-state.ts";
it("fails a derived program check when a calculation mutates its received map", async () => {
  const current = program();
  const sales: typeof shopSlices.step.sales = (state, event, before) => {
    if (event.kind === "sale-registered" && state instanceof Map)
      state.set(event.data.sale, { total: event.data.total, paid: 0, by: event.by });
    return shopSlices.step.sales(state, event, before);
  };
  const mutable = { ...current, slices: { ...current.slices, step: { ...current.slices.step, sales } } };
  await expect(
    staged(mutable, async ({ house }) => {
      await perform(house(), "sales", { act: "register", input: { sale: "s1", total: 10 } });
    }),
  ).rejects.toThrow(/cannot mutate/);
});
it("protects nested objects, arrays, map values, sets and dates, including cycles", () => {
  const value = { list: [1], map: new Map([["a", { n: 1 }]]), set: new Set([1]), date: new Date(0) };
  const cycle = { value, back: new Map<string, unknown>() };
  cycle.back.set("self", cycle);
  frozenState(cycle);
  expect(() => value.list.push(2)).toThrow();
  expect(() => value.map.set("b", { n: 2 })).toThrow(/cannot mutate/);
  expect(() => {
    const a = value.map.get("a");
    if (a) a.n++;
  }).toThrow();
  expect(() => value.set.add(2)).toThrow(/cannot mutate/);
  expect(() => value.date.setTime(1)).toThrow(/cannot mutate/);
});
