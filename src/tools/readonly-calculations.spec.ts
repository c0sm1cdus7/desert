import { expect, it } from "vitest";
import { effect } from "../house/facts.ts";
import { startState, toolsStep } from "../house/state.ts";
import { shop, shopSlices, type Shop } from "../../tests/support/shop.ts";
import { mutate } from "../../tests/support/state-mutations.ts";
const event = shop.read({ ...effect("boot", {}, "shop"), id: "one", at: 0, seq: 1 });
for (const part of ["own", "before"])
  it(`a calculation cannot change ${part} state`, () => {
    const state = startState<Shop>(shopSlices, "shop");
    const slices = {
      ...shopSlices,
      step: {
        ...shopSlices.step,
        sales: (kept: typeof state.tools.sales, _event: typeof event, before: typeof state) => {
          if (part === "own") mutate(kept, "set", "fake", { total: 999, paid: 0, by: "ana" });
          else Object.assign(before.house, { admin: "beto" });
          return kept;
        },
      },
    };
    expect(() => toolsStep<Shop>(state, event, slices)).toThrow(/cannot mutate/);
    expect(state.tools.sales.size).toBe(0);
    expect(state.house.admin).toBe("");
  });
it("a calculation can reuse values without leaking retained mutable results", () => {
  const returned = new Map([["one", { total: 1, paid: 0, by: "ana" }]]);
  const slices = { ...shopSlices, step: { ...shopSlices.step, sales: () => returned } };
  const next = toolsStep<Shop>(startState<Shop>(shopSlices, "shop"), event, slices);
  returned.clear();
  expect(next.tools.sales.get("one")?.total).toBe(1);
  expect(() => structuredClone(next)).not.toThrow();
});
