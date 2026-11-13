import { expect, it } from "vitest";
import { tree } from "./tree.ts";
import rules from "./rules.json" with { type: "json" };

it("field descriptions keep the responsibilities that preceded the new guarantees", () => {
  for (const [file, before] of [
    [
      "catalogs/fields.ts",
      "the fields an act can take, each with how it is asked: text, money, quantity, count, day, option, oneOf, many",
    ],
    [
      "surface/bridge/asking-parts.ts",
      "how a declared field says its question, options, value and mask; the field that picks a thing of a tool",
    ],
    [
      "surface/screen.ts",
      "Session, Walk, begin: where a device stands and the act it walks, started with what it already has",
    ],
    ["surface/walk.ts", "an act as a thread: answers, the current question, running or done; hints"],
  ]) {
    expect(tree[file ?? ""]).toContain(before);
    expect(tree[file ?? ""]).not.toBe(before);
  }
});

it("all four field guarantees have their assigned registry numbers", () => {
  expect(
    rules.rules
      .filter(rule => rule.id >= 213 && rule.id <= 216)
      .map(rule => rule.id)
      .sort(),
  ).toEqual([213, 214, 215, 216]);
});
