import { failing } from "../../tests/support/failed-checks.ts";
// A row that says everything its act takes: what the act would refuse is off on the row, saying why.
import { describe, expect, it } from "vitest";
import { programChecks } from "./program-checks.ts";
import { carelessShown, knowingShown, markingShop, overMarked } from "../../tests/support/marking-shop.ts";

describe("a program with a row that carries everything its act takes", () => {
  for (const check of programChecks(markingShop, knowingShown)) it(check.name, check.run);

  it("fails the walk of a refusal its row could say and does not say", async () => {
    expect(
      await failing(
        programChecks(markingShop, carelessShown),
        "the act mark is not off exactly when its tool says why",
      ),
    ).toEqual([`${overMarked}, by keys`]);
  });
});
