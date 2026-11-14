import "../../tests/support/upgrade-vault.ts";
import { expect, it } from "vitest";
import { directedShop } from "../../tests/support/directed-shop.ts";
import { shopShown } from "../../tests/support/shop.ts";
import { noticeChecks } from "./promised-notices.ts";
import { promisedChecks } from "./promised.ts";
import { stillOwing } from "../../tests/support/settling-shop.ts";

it.each(["ana", "beto"])("12: derives Attention for the case actor when the need names %s", async to => {
  const program = directedShop(true, to);
  const checks = noticeChecks(program, shopShown).filter(check => check.name.endsWith("in Attention with why"));
  expect(checks).toHaveLength(2);
  for (const check of checks) await check.run();
});

it("12: detects a recipient omitted by the case in both the house and Attention checks", async () => {
  const program = directedShop(false);
  const checks = [...promisedChecks(program), ...noticeChecks(program, shopShown)].filter(
    check => check.name === stillOwing || check.name === `${stillOwing}, in Attention with why`,
  );
  expect(checks).toHaveLength(2);
  for (const check of checks) await expect(check.run()).rejects.toThrow();
});
