import { expect, it } from "vitest";
import fieldTree from "./field-tree.json" with { type: "json" };
import { tree } from "./tree.ts";
import rules from "./rules.json" with { type: "json" };

it("field descriptions keep the responsibilities that preceded the new guarantees", () => {
  for (const [file, before] of Object.entries(fieldTree)) expect(tree[file]).toContain(before);
  for (const file of [
    "fields/fields.ts",
    "surface/bridge/questions/asking-parts.ts",
    "surface/session/screen.ts",
    "surface/acts/walk.ts",
    "surface/formats/masks.ts",
    "surface/bridge/questions/asking.ts",
    "surface/session/kept-answers.ts",
    "surface/session/current-field.ts",
    "surface/router/step.ts",
    "surface/acts/walking.ts",
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
      "src/surface/session/kept-answers.ts",
      "src/surface/session/current-field.ts",
      "src/checks/promises/cases/promised-money.spec.ts",
    ]),
  );
});

it("field descriptions say their current responsibilities once", () => {
  expect(tree["surface/router/step.ts"]?.match(/step:/gu)).toHaveLength(1);
  expect(tree["surface/router/step.ts"]).toContain("any written paste");
  expect(tree["surface/bridge/acts/asked-act.ts"]?.match(/Composes/gu)).toHaveLength(1);
  expect(tree["surface/bridge/acts/asked-act.ts"]).toContain("current state and destination");
});
