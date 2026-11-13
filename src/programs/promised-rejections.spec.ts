// Compiling counterexamples prove the gate distinguishes blocked input from a result produced by the world.
import { describe, expect, it } from "vitest";
import { anyToolScreen } from "../surface/bridge/any-tool.ts";
import type { Shown } from "../surface/bridge/house-ports.ts";
import type { ToolAct } from "../tools/tool-contract.ts";
import type { Composition, ProgramAct } from "../tools/promises.ts";
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
  const run: ToolAct<Shop>["run"] = (input, context) =>
    context.state.tools.sales.size ? { status: "rejected", reason: "repeated" } : act.run(input, context);
  Reflect.set(rest, "run", run);
  return rest;
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
    await expect(byKeys(late, "already registered")).rejects.toThrow("E-PROG-1");
  });
  it("fails when an external case closes in the question instead of running", async () => {
    const early = changed(printingShop, "print", act => ({ ...act, stops: () => "printer offline · desk" }));
    await expect(byKeys(early, "printer is offline")).rejects.toThrow("E-PROG-1");
  });
  it("fails when the external case runs but reports success instead of Error", async () => {
    const silent = changed(printingShop, "print", act => {
      const changed = { ...act };
      Reflect.set(changed, "run", () => ({ status: "accepted", text: "printer offline · desk" }));
      return changed;
    });
    await expect(byKeys(silent, "printer is offline")).rejects.toThrow();
  });
  it("fails a compiling surface with an empty later question in an accepted case", async () => {
    await expect(byKeys(shopProgram, "as it was told", emptyLater)).rejects.toThrow("nothing eligible");
  });
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
