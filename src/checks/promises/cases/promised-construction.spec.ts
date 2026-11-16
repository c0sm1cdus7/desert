import { derivedShop, derivedShown } from "../../../../tests/support/derived-shop.ts";
import { expect, it } from "vitest";
import { constructionShop, foreignOpen } from "../../../../tests/support/construction-shop.ts";
import { lostShown, partsShown } from "../../../../tests/support/correcting-shop.ts";
import { walkedChecks } from "../../../testing.ts";
import type { Shown } from "../../../surface/bridge/ports/house-ports.ts";
import type { Shop } from "../../../../tests/support/shop.ts";

const check = (shown: Shown<Shop> = partsShown, accepted = false, lies = false) => {
  const found = walkedChecks(constructionShop(accepted, lies), shown).find(check =>
    check.name.endsWith("both answers differ, by keys"),
  );
  if (!found) throw new Error("missing check");
  return found;
};
it("proves every entry fixes an incompatible answer, including two different changed data", async () => {
  await expect(check().run()).resolves.toBeUndefined();
});
it("names the foreign row that leaves the case's answers open", async () => {
  await expect(check(foreignOpen).run()).rejects.toThrow("corrección abierta");
});
it("rejects construction when nobody offers the action", async () => {
  await expect(check(lostShown).run()).rejects.toThrow("No row offers correct");
});
it("never closes an accepted case by construction", async () => {
  await expect(check(partsShown, true).run()).rejects.toThrow("Accepted case has no screen path");
});
it("keeps the direct refusal even if all screen rows fix different answers", async () => {
  await expect(check(partsShown, false, true).run()).rejects.toThrow("refusal");
});

it("reports the construction closure after proving the direct refusal", async () => {
  const proof = check();
  await proof.run();
  expect(proof.report?.()).toBe(
    "Closed by construction: every entry fixes an incompatible answer; direct refusal verified",
  );
});
it("proves a single fixed answer, as when only existing item numbers have rows", async () => {
  const original = partsShown.screens?.sales;
  if (!original) throw new Error("missing screen");
  const one: Shown<Shop> = {
    ...partsShown,
    screens: {
      sales: (...args) => {
        const screen = original(...args);
        return {
          ...screen,
          view: target =>
            screen.view(target).map(stack => ({ ...stack, rows: stack.rows.filter(row => row.title !== "total") })),
        };
      },
    },
  };
  await expect(check(one).run()).resolves.toBeUndefined();
});

it("reports a declared cause, an unwriteable datum and the missing-path diagnosis", async () => {
  const checks = walkedChecks(derivedShop(), derivedShown());
  for (const [promise, message] of [
    ["reads a closed sale", "Closed by a declared cause"],
    ["cannot finish an empty amount", "Closed by an unwriteable datum"],
  ]) {
    const proof = checks.find(check => check.name.endsWith(`${promise}, by keys`));
    expect(proof).toBeDefined();
    await proof?.run();
    expect(proof?.report?.()).toBe(message);
  }
  const missing = check(lostShown);
  await expect(missing.run()).rejects.toThrow("No row offers correct");
  expect(missing.report?.()).toContain("No screen path");
});
