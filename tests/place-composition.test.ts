import test from "node:test";
import assert from "node:assert/strict";
import { placeContent, stackNodes } from "../src/interaction/place.ts";
import { travelKit } from "../products/landmarks/exercises.ts";

const input = { version: "desert.bank-node/1", kind: "input.text", name: "amount", label: "Estimated budget",
  value: "", required: false, disabled: false } as const;
const valid = { title: "Travel kit", subtitle: "Plan your next visit.",
  stacks: [{ id: "budget", title: "Budget", items: [input] }] };

test("a place has one heading and only titled, nonempty stacks", () => {
  assert.deepEqual(placeContent(valid), valid);
  for (const invalid of [
    { ...valid, content: [input] }, { ...valid, title: " " }, { ...valid, subtitle: "" },
    { ...valid, stacks: [] }, { ...valid, stacks: [{ ...valid.stacks[0], title: "" }] },
    { ...valid, stacks: [{ ...valid.stacks[0], items: [] }] },
    { ...valid, stacks: [...valid.stacks, ...valid.stacks] },
    { ...valid, stacks: [{ ...valid.stacks[0], items: [input, input] }] },
    { ...valid, stacks: [{ ...valid.stacks[0], items: [{ version: "desert.bank-node/1", kind: "problem", open: true,
      title: "Unexpected modal", description: "Not inline content", locked: false, severity: "error" }] }] },
  ]) assert.throws(() => placeContent(invalid), /INVALID_PLACE/);
});

test("Travel kit authors Budget as a sibling stack, not an ungrouped money input", () => {
  const budget = travelKit.stacks.find(stack => stack.id === "budget");
  assert.equal(budget?.title, "Budget");
  assert.equal(budget?.items.length, 1);
  assert.equal(budget?.items[0]?.kind, "control.money");
  assert.equal(travelKit.stacks.some(stack => stack.id === "preferences"), false);
});

test("stack content stays directly visible and legacy disclosures are rejected, not flattened", () => {
  const summary = { version: "desert.bank-node/1", kind: "fact", details: {
    kind: "facts", object: "draft", fields: ["storage"], labels: { "draft.storage": "Storage" }, facts: { storage: "This tab" },
  } } as const;
  const compose = (items: readonly unknown[]) => ({ ...valid, stacks: [{ id: "draft", title: "About this draft", items }] });
  const result = placeContent(compose([summary, input]));
  assert.deepEqual(stackNodes(result.stacks[0]!.items), [summary, input]);
  assert.ok(Object.isFrozen(result.stacks[0]!.items));
  for (const item of [
    { kind: "disclosure", summary, items: [input] },
    { kind: "collapsible", summary, items: [input] },
    { kind: "accordion", summary, items: [input] },
    { ...summary, collapsed: true },
  ]) assert.throws(() => placeContent(compose([item])), { message: "INVALID_PLACE" });
  assert.throws(() => placeContent({ ...valid, stacks: [{ ...valid.stacks[0], collapsible: true }] }),
    { message: "INVALID_PLACE" });
});
