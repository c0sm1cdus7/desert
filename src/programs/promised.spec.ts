// The checks a program's promises derive, run on the test shop; and shops that break a promise, which they catch.
import { describe, expect, it } from "vitest";
import { walkedChecks } from "./promised-walk.ts";
import { promisedChecks, type Check } from "./promised.ts";
import { brokenShops } from "../../tests/support/broken-shops.ts";
import { hidingShown, nestedShown, settledTwice, settles, settlingShop } from "../../tests/support/settling-shop.ts";
import { shopProgram, shopShown } from "../../tests/support/shop.ts";

/** The names of the checks that fail, in the order they ran. */
async function failing(checks: readonly Check[]): Promise<string[]> {
  const failed: string[] = [];
  for (const check of checks) await check.run().catch(() => failed.push(check.name));
  return failed;
}
describe("what the shop promises", () => {
  for (const check of promisedChecks(shopProgram)) it(check.name, check.run);
  for (const check of walkedChecks(shopProgram, shopShown)) it(check.name, check.run);
});

describe("a program that breaks a promise", () => {
  it.each(brokenShops)("$name: fails exactly the checks of what it broke", async ({ program, fails }) => {
    expect(await failing([...promisedChecks(program), ...walkedChecks(program, shopShown)])).toEqual(fails);
  });
});

describe("a program with acts on its things", () => {
  for (const check of promisedChecks(settlingShop)) it(check.name, check.run);
  for (const check of walkedChecks(settlingShop, shopShown)) it(check.name, check.run);
  for (const check of walkedChecks(settlingShop, nestedShown)) it(`${check.name}, two views deep`, check.run);
  it("a screen that lists none of its things fails every walk to one of them, and no other", async () => {
    const walks = [settles, settledTwice].map(check => `${check}, by keys`);
    expect(await failing(walkedChecks(settlingShop, hidingShown))).toEqual(walks);
  });
});
