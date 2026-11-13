// Compiling counterexamples prove the gate distinguishes blocked input from a result produced by the world.
import { describe, expect, it } from "vitest";
import { anyToolScreen } from "../surface/bridge/any-tool.ts";
import type { Shown } from "../surface/bridge/house-ports.ts";
import type { Composition, ProgramAct } from "../tools/promises.ts";
import { chargingShop } from "../../tests/support/charging-shop.ts";
import { correctingShop, registered } from "../../tests/support/correcting-shop.ts";
import { printingShop } from "../../tests/support/printing-shop.ts";
import { shopProgram, shopShown, type Shop } from "../../tests/support/shop.ts";
import { programChecks } from "./program-checks.ts";
import { walkedChecks } from "./promised-walk.ts";
import { given, perform, staged } from "./promised-stage.ts";

const changed = (program: Composition<Shop>, name: string, change: (act: ProgramAct<Shop>) => ProgramAct<Shop>) => ({
  ...program,
  registry: program.registry.map(tool => ({
    ...tool,
    acts: Object.fromEntries(Object.entries(tool.acts).map(([key, act]) => [key, key === name ? change(act) : act])),
  })),
});
const byKeys = (program: Composition<Shop>, promise: string, shown = shopShown) => {
  const check = walkedChecks(program, shown).find(
    check => check.name.includes(promise) && check.name.endsWith(", by keys"),
  );
  expect(check).toBeDefined();
  return check?.run();
};
/** The raw ProgramAct shape simulates an implementation compiled elsewhere that bypasses programAct's guard. */
const late = changed(shopProgram, "register", act => {
  const { stops: _before, ...rest } = act;
  return {
    ...rest,
    run: (input, context) =>
      context.state.tools.sales.size ? { status: "rejected", reason: "repeated" } : act.run(input, context),
  };
});
const emptyLater: Shown<Shop> = {
  ...shopShown,
  screens: {
    sales: (ports, tool, words, acts, start) => {
      const plain = anyToolScreen(ports, tool, words, acts, start);
      return {
        ...plain,
        acts: Object.fromEntries(
          Object.entries(plain.acts).map(([name, act]) => [
            name,
            {
              ...act,
              next: answers => (answers.length ? { kind: "one", ask: "Nothing", options: [] } : act.next(answers)),
            },
          ]),
        ),
      };
    },
  },
};

describe("the gate closes every internal refusal before running", () => {
  for (const check of programChecks(printingShop, shopShown)) it(check.name, check.run);

  it("fails a compiling action returning an internal cause after answering, even without facts", async () => {
    await expect(byKeys(late, "already registered")).rejects.toThrow("An internal refusal could be submitted");
  });
  it("fails when an external case closes in the question instead of running", async () => {
    const early = changed(printingShop, "print", act => ({ ...act, stops: () => "printer offline · desk" }));
    await expect(byKeys(early, "printer is offline")).rejects.toThrow("did not run exactly once");
  });
  it("fails when the external case runs but reports success instead of Error", async () => {
    const silent = changed(printingShop, "print", act => ({
      ...act,
      run: () => ({ status: "accepted", text: "printer offline · desk" }),
    }));
    await expect(byKeys(silent, "printer is offline")).rejects.toThrow();
  });
  it("fails a compiling surface with an empty later question in an accepted case", async () => {
    await expect(byKeys(shopProgram, "as it was told", emptyLater)).rejects.toThrow("nothing eligible");
  });
  it("keeps rejecting a nonexistent reference through another door before running", () =>
    staged(chargingShop, async ({ house }) => {
      await given(house(), "sales", [registered]);
      const result = await perform(house(), "payments", { act: "charge", input: { sale: "sales/zz", amount: 1 } });
      expect(result).toMatchObject({ status: "rejected", reason: "unknown" });
    }));
  it("keeps rejecting overpayment when both supplied values differ from today through another door", () =>
    staged(correctingShop, async ({ house }) => {
      await given(house(), "sales", [registered]);
      const result = await perform(house(), "sales", {
        act: "correct",
        on: "sales/s1",
        input: { total: 100, paid: 2000 },
      });
      expect(result).toMatchObject({ status: "rejected", reason: "overpaid" });
    }));
});
