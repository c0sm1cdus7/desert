import { failing } from "../../../../tests/support/failed-checks.ts";
// A row that says everything its act takes: what the act would refuse is off on the row, saying why.
import { describe, expect, it } from "vitest";
import { programChecks } from "../../program-checks.ts";
import { carelessShown, knowingShown, markingShop, overMarked } from "../../../../tests/support/marking-shop.ts";

describe("a program with a row that carries everything its act takes", () => {
  for (const check of programChecks(markingShop, knowingShown)) it(check.name, check.run);

  const carelessChecks = programChecks(markingShop, carelessShown);
  it("keeps exactly one walk for the refusal the careless screen hides", () => {
    expect(carelessChecks.filter(check => check.name === `${overMarked}, by keys`)).toHaveLength(1);
  });
  for (const check of carelessChecks)
    it(`checks the careless screen · ${check.name}`, async () => {
      expect(await failing([check], "the act mark is not off exactly when its tool says why")).toEqual(
        check.name === `${overMarked}, by keys` ? [check.name] : [],
      );
    });
});
