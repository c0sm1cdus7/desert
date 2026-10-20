import test from "node:test";
import assert from "node:assert/strict";
import { reduceCatalogDraft } from "../src/public-catalog/draft.ts";
import { travelKit } from "../products/landmarks/exercises.ts";

test("local catalog draft retains identity, validates events and never mutates its definition", () => {
  const snapshot = JSON.stringify(travelKit);
  const edited = reduceCatalogDraft(travelKit, { kind: "input.change", name: "trip-name", value: "Autumn in Japan" });
  const name = edited.stacks.flatMap(section => section.items).find(node => node.kind === "input.text");
  assert.equal(name?.kind === "input.text" && name.value, "Autumn in Japan");
  assert.equal(JSON.stringify(travelKit), snapshot);
  assert.throws(() => reduceCatalogDraft(travelKit, { kind: "input.change", name: "unknown", value: "x" }), /UNKNOWN_DRAFT_TARGET/);
  assert.throws(() => reduceCatalogDraft(travelKit, { kind: "catalog.open", record: "1016" }), /LOCAL_DRAFT_EVENT_REQUIRED/);
});

test("local money and options use the bank reducers and reject invalid choices", () => {
  const edited = reduceCatalogDraft(travelKit, { kind: "money.change", control: "budget", currency: "USD", minorUnits: "125099" });
  const money = edited.stacks.flatMap(section => section.items).find(node => node.kind === "control.money");
  assert.equal(money?.kind === "control.money" && money.control.minorUnits, "125099");
  assert.throws(() => reduceCatalogDraft(travelKit, { kind: "options.change", control: "activities", selected: ["invented"] }));
});

test("local draft updates reject legacy disclosure containers before editing nested content", () => {
  const input = { version: "desert.bank-node/1", kind: "input.text", name: "draft", label: "Draft",
    value: "", required: false, disabled: false } as const;
  const summary = { version: "desert.bank-node/1", kind: "fact", details: {
    kind: "facts", object: "draft", fields: ["storage"], labels: { "draft.storage": "Storage" }, facts: { storage: "This tab" },
  } } as const;
  const current = { title: "Draft", subtitle: "Local draft only.", stacks: [{ id: "draft", title: "About this draft", items: [
    { kind: "disclosure", summary, items: [input] },
  ] }] };
  const snapshot = JSON.stringify(current);
  assert.throws(() => reduceCatalogDraft(current as never, { kind: "input.change", name: "draft", value: "Edited" }),
    { message: "INVALID_PLACE" });
  assert.equal(JSON.stringify(current), snapshot);
});
