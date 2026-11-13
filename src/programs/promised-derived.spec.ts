// Regressions from a real program, reproduced using only the base's shop.
import { expect, it } from "vitest";
import { derivedShop, derivedShown, derivedWords, orderedShop } from "../../tests/support/derived-shop.ts";
import { shopShown } from "../../tests/support/shop.ts";
import { walkedChecks } from "./promised-walk.ts";
import { optionsOf } from "../surface/screen.ts";
import { keptPath } from "./kept-path.ts";
import { given, staged } from "./promised-stage.ts";
import { choiceChecks } from "./promised-choices.ts";
import { shownChecks } from "./promised-off.ts";
import type { Check } from "./promised-stage.ts";

async function run(checks: readonly Check[], name: string) {
  const found = checks.filter(check => check.name.includes(name));
  expect(found.length).toBeGreaterThan(0);
  for (const check of found) await check.run();
}
it("reads a disabled reason below a window of shop data", () =>
  run(walkedChecks(derivedShop(false, derivedWords.closed, true), derivedShown(true)), "reads a closed sale, by keys"));
it("accepts a whole declared cause containing sin cambios", () =>
  run(walkedChecks(derivedShop(false, derivedWords.cause), shopShown), "reviews a sale, by keys"));
it("preserves the datum in its actual menu when a neighboring action stays enabled", () =>
  run(shownChecks(derivedShop(true), derivedShown()), "reads a closed sale"));
it("proves an unwriteable shop datum without inventing an action reason", () =>
  run(walkedChecks(derivedShop(), shopShown), "cannot finish an empty amount, by keys"));
it("orders current and other disabled things after every eligible choice", () =>
  run(choiceChecks(orderedShop, shopShown), "current follows eligible sales"));

it("keeps fixed options in their natural order even when current is disabled", () => {
  const options = [{ title: "Anterior" }, { title: "Actual" }, { title: "Siguiente" }];
  const rows = optionsOf({ kind: "one", ask: "Estado", options, current: "Actual", only: true });
  expect(rows.map(row => row.title)).toEqual(options.map(option => option.title));
  expect(rows[1]).toMatchObject({ off: true, detail: "actual" });
});
it("walks kept journal screens with a legitimate cause containing sin cambios", () => {
  const program = derivedShop(false, derivedWords.cause);
  return staged(program, async ({ house }) => {
    await given(house(), "sales", [{ act: "register", input: { sale: "s1", total: 100 } }]);
    const result = await keptPath(program, shopShown, house(), house().now(), [
      { kind: "type", text: "v" },
      { kind: "type", text: "1" },
    ]);
    expect(result.branches.length).toBeGreaterThan(0);
  });
});
