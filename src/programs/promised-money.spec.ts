import { expect, it } from "vitest";
import { moneyRegistry } from "../../tests/support/money-program.ts";
import { shopProgram, shopShown } from "../../tests/support/shop.ts";
import { promisedChecks } from "./promised.ts";
import { walkedChecks } from "./promised-walk.ts";

import { given, staged } from "./promised-stage.ts";
import { seated } from "./promised-keys.ts";
import { missingAt } from "./promised-route.ts";
import { must } from "../surface/window.ts";
const program = { ...shopProgram, registry: moneyRegistry };
for (const check of [...promisedChecks(program), ...walkedChecks(program, shopShown)]) it(check.name, check.run);

it("the missing-route question uses the case's state and sale target", async () => {
  await staged(program, async ({ house }) => {
    const tool = must(program.registry.find(tool => tool.id === "sales"));
    const act = must(tool.acts.credit);
    const kase = must(act.cases[0]);
    await given(house(), tool.id, kase.given);
    const seat = seated(house(), "ana", shopShown);
    try {
      expect(missingAt(seat, { aim: { tool, act, name: "credit" }, kase, answers: ["1005"] })).toBe("Nota de crédito");
    } finally {
      seat.router.stop();
    }
  });
});
