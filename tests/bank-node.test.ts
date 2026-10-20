import test from "node:test";
import assert from "node:assert/strict";
import { BankNodeSchema } from "../src/interaction/bank-schema.ts";
import { BankVersion as version, bankNode, controlBankNode } from "../src/interaction/bank-node.ts";
import { bankEvent } from "../src/interaction/bank-events.ts";
import { InteractionCatalog } from "../src/interaction/catalog.ts";
import { ControlBank } from "../src/interaction/control-bank.ts";
import { presentCollection } from "../src/interaction/bank-presenters.ts";
import { presentSpecimen } from "../src/svelte/catalog/specimen-presentation.ts";
import { compile } from "../src/compile.ts";
import { Notebook } from "../products/notebook/product.ts";
import type { HumanSurface } from "../src/web/types.ts";

const surface = compile(Notebook).surface("human") as HumanSurface;
const input = { version, kind: "input.text", name: "title", label: "Title", value: "", disabled: false, required: true } as const;

test("one bank grammar covers the exact installed catalog and every isolated specimen validates", () => {
  assert.deepEqual([...new Set(BankNodeSchema.anyOf.map(schema => schema.properties.kind.const))].sort(),
    InteractionCatalog.entries.map(entry => entry.id).sort());
  for (const entry of InteractionCatalog.entries) for (const scenario of entry.states) {
    const { nodes } = presentSpecimen(entry.id, scenario, surface, { open: false, locked: false, draft: {} }, () => true);
    for (const node of nodes) assert.deepEqual(bankNode(node), node);
  }
  for (const entry of ControlBank) for (const sample of entry.specimens) {
    const node = controlBankNode(sample.node);
    assert.equal(node.kind, entry.id);
    assert.ok(Object.isFrozen(node.control));
    assert.deepEqual(bankNode(JSON.parse(JSON.stringify(node))), node);
  }
});

test("bank descriptors reject callback, markup, style, invalid version and incompatible controls", () => {
  assert.deepEqual(bankNode(input), input);
  for (const extra of [{ props: {} }, { class: "p-0" }, { style: "color:red" }, { children: "<p/>" }, { onclick: () => {} }]) {
    assert.throws(() => bankNode({ ...input, ...extra }), /INVALID_BANK_NODE|JSON/);
  }
  assert.throws(() => bankNode({ ...input, version: "invented" }), /INVALID_BANK_NODE/);
  const selection = ControlBank.find(entry => entry.id === 'control.select')!.specimens[0]!.node;
  assert.throws(() => bankNode({ version, kind: "control.date", control: selection }), /INVALID_BANK_NODE/);
  assert.throws(() => bankNode({ version, kind: "form", content: { kind: "form", submit: "save", fields: [
    { name: "title", primitive: "input.text", label: "Title", value: "", required: true },
    { name: "title", primitive: "input.text", label: "Duplicate", value: "", required: true },
  ] } }), /INVALID_SURFACE_FRAME_FIELDS/);
  assert.throws(() => bankNode({ version, kind: "context", content: { kind: "form", submit: "save", fields: [] } }), /INVALID_BANK_NODE/);
});

test("local events cannot become journey intents and dismissal cannot become primary", () => {
  assert.deepEqual(bankEvent({ kind: "local.invoke", intent: { kind: "search.clear" } }),
    { kind: "local.invoke", intent: { kind: "search.clear" } });
  assert.throws(() => bankEvent({ kind: "surface.invoke", intent: { kind: "search.clear" } }), /INVALID_BANK_EVENT/);
  assert.throws(() => bankEvent({ kind: "input.change", name: "title", value: "x", callback: "submit" }), /INVALID_BANK_EVENT/);
  assert.throws(() => bankNode({ version, kind: "action", role: "primary",
    action: { intent: { kind: "close" }, icon: "close", label: "Close", state: "ready" } }), /INVALID_BANK_ACTION/);
});

test("collection projection carries only declared collection fields without modifying input records", () => {
  const records = [{ id: "record", version: 1, facts: { title: "Visible", state: "active", body: "Detail only", owner: "Private" } }];
  const node = presentCollection(surface, records, { loaded: true, disabled: false, selectedId: null });
  assert.deepEqual(node.records[0]!.facts, { state: "active", title: "Visible" });
  assert.equal(records[0]!.facts.owner, "Private");
  assert.throws(() => bankNode({ ...node, records }), /INVALID_BANK_COLLECTION/);
});
