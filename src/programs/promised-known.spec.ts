// A row that says everything its act takes: what the act would refuse is off on the row, saying why.
import { describe, expect, it } from "vitest";
import type { Check } from "./promised-stage.ts";
import { programChecks } from "./program-checks.ts";
import { carelessShown, knowingShown, markingShop, overMarked } from "../../tests/support/marking-shop.ts";

async function failing(checks: readonly Check[]): Promise<string[]> {
  const failed: string[] = [];
  for (const check of checks) await check.run().catch(() => failed.push(check.name));
  return failed;
}

describe("a program with a row that carries everything its act takes", () => {
  for (const check of programChecks(markingShop, knowingShown)) it(check.name, check.run);

  it("fails the walk of a refusal its row could say and does not say", async () => {
    expect(await failing(programChecks(markingShop, carelessShown))).toEqual([`${overMarked}, by keys`]);
  });
});
