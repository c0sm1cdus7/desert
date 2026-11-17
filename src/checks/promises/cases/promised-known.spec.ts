import { failing } from "../../../../tests/support/failed-checks.ts";
// A row that says everything its act takes: what the act would refuse is off on the row, saying why.
import { describe, expect, it } from "vitest";
import { programChecks } from "../../program-checks.ts";
import { carelessShown, knowingShown, markingShop, overMarked } from "../../../../tests/support/marking-shop.ts";

describe("a program with a row that carries everything its act takes", () => {
  for (const check of programChecks(markingShop, knowingShown)) it(check.name, check.run);

  describe("fails the walk of a refusal its row could say and does not say", () => {
    const checks = programChecks(markingShop, carelessShown);
    const refused = `${overMarked}, by keys`;

    it("includes the refused walk exactly once", () => {
      expect(checks.filter(check => check.name === refused).map(check => check.name)).toEqual([refused]);
    });

    // Keep every check and its diagnostic, with a separate deadline for each house and walk.
    for (const check of checks)
      it(check.name, async () => {
        expect(await failing([check], "the act mark is not off exactly when its tool says why")).toEqual(
          check.name === refused ? [refused] : [],
        );
      });
  });
});
