// The checks a program's promises derive, run on the test shop; and shops that break a promise, which they catch.
import { describe, expect, it } from "vitest";
import { promisedChecks } from "./promised.ts";
import { brokenShops } from "../../tests/support/broken-shops.ts";
import { shopProgram } from "../../tests/support/shop.ts";

describe("what the shop promises", () => {
  for (const check of promisedChecks(shopProgram)) it(check.name, check.run);
});

describe("a program that breaks a promise", () => {
  it.each(brokenShops)("$name: fails exactly the checks of what it broke", async ({ program, fails }) => {
    const failed: string[] = [];
    for (const check of promisedChecks(program)) await check.run().catch(() => failed.push(check.name));
    expect(failed).toEqual(fails);
  });
});
