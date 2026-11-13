import { expect, it } from "vitest";
import fieldTree from "./field-tree.json" with { type: "json" };
import { tree } from "./tree.ts";
import rules from "./rules.json" with { type: "json" };

it("field descriptions keep the responsibilities that preceded the new guarantees", () => {
  for (const [file, before] of Object.entries(fieldTree)) expect(tree[file]).toContain(before);
  for (const file of [
    "catalogs/fields.ts",
    "surface/bridge/asking-parts.ts",
    "surface/screen.ts",
    "surface/walk.ts",
    "surface/masks.ts",
    "surface/bridge/asking.ts",
    "surface/kept-answers.ts",
    "surface/current-field.ts",
    "surface/step.ts",
    "surface/walking.ts",
  ] as const)
    expect(tree[file]).not.toBe(fieldTree[file]);
});

it("all four field guarantees have their assigned registry numbers", () => {
  expect(
    rules.rules
      .filter(rule => rule.id >= 213 && rule.id <= 216)
      .map(rule => rule.id)
      .sort(),
  ).toEqual([213, 214, 215, 216]);
});

it("one currency rule records the base, with current and carried amounts as evidence", () => {
  const currency = rules.rules.filter(rule => /moneda.*campo|campo.*moneda/u.test(rule.rule));
  expect(currency.map(rule => rule.id)).toEqual([215]);
  expect(currency[0]?.rule).not.toContain("confirmación");
  expect(currency[0]?.evidence).toEqual(
    expect.arrayContaining([
      "src/surface/kept-answers.ts",
      "src/surface/current-field.ts",
      "src/programs/promised-money.spec.ts",
    ]),
  );
});
