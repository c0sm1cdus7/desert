// The checks a program's promises derive, run on the test shop; and shops that break a promise, which they catch.
import { describe, expect, it } from "vitest";
import { walkedChecks } from "./promised-walk.ts";
import { promisedChecks } from "./promised.ts";
import { brokenShops } from "../../tests/support/broken-shops.ts";
import { shopProgram, shopShown } from "../../tests/support/shop.ts";

describe("what the shop promises", () => {
  for (const check of promisedChecks(shopProgram)) it(check.name, check.run);
  for (const check of walkedChecks(shopProgram, shopShown)) it(check.name, check.run);
});

describe("a program that breaks a promise", () => {
  it.each(brokenShops)("$name: fails exactly the checks of what it broke", async ({ program, fails }) => {
    const failed: string[] = [];
    const checks = [...promisedChecks(program), ...walkedChecks(program, shopShown)];
    for (const check of checks) await check.run().catch(() => failed.push(check.name));
    expect(failed).toEqual(fails);
  });
});
