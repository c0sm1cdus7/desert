import { expect, it } from "vitest";
import { chargingShop } from "../../tests/support/charging-shop.ts";
import { windowShop } from "../../tests/support/window-shop.ts";
import { shopProgram, shopShown } from "../../tests/support/shop.ts";
import { choiceChecks } from "./promised-choices.ts";
import { shownChecks } from "./promised-off.ts";

it("derives foreign selection from a case with a populated picker", async () => {
  const check = choiceChecks(chargingShop, shopShown).find(item =>
    item.name.includes("a sale is charged from payments, picked by its name"),
  );
  expect(check).toBeDefined();
  await check?.run();
});

it("derives foreign references from a case with a populated source", async () => {
  const fixture = windowShop(1);
  try {
    const program = { ...shopProgram, registry: fixture.registry };
    const check = shownChecks(program, fixture.shown).find(
      item => item.name.includes("select") && item.name.includes("referencias legibles"),
    );
    expect(check).toBeDefined();
    await check?.run();
  } finally {
    fixture.close();
  }
});
