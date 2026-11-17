import { failing } from "../../../../tests/support/failed-checks.ts";
// A row that says everything its act takes: what the act would refuse is off on the row, saying why.
import { describe, expect, it } from "vitest";
import { programChecks } from "../../program-checks.ts";
import { carelessShown, knowingShown, markingShop, overMarked } from "../../../../tests/support/marking-shop.ts";

describe("a program with a row that carries everything its act takes", () => {
  for (const check of programChecks(markingShop, knowingShown)) it(check.name, check.run);

  describe("fails the walk of a refusal its row could say and does not say", () => {
    const checks = programChecks(markingShop, carelessShown);
    const expected = `${overMarked}, by keys`;
    it("derives the expected failure exactly once", () => {
      expect(checks.filter(check => check.name === expected)).toHaveLength(1);
    });
    // Each check opens its own house: keep every check, with its own deadline and diagnostic.
    for (const check of checks)
      it(check.name, async () => {
        expect(await failing([check], "the act mark is not off exactly when its tool says why")).toEqual(
          check.name === expected ? [expected] : [],
        );
      });
  });
});
