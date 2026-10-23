import test from "node:test";
import assert from "node:assert/strict";
import { ResolvedNodeSchema } from "../src/interaction/resolved-node-schema.ts";
import { ResolvedNodeVersion as version, resolvedNode, controlResolvedNode } from "../src/interaction/resolved-node.ts";
import { nodeEvent } from "../src/interaction/node-events.ts";
import { ResolvedNodes } from "../src/interaction/catalog.ts";
import { ControlSpecimens } from "../src/interaction/control-specimens.ts";
import { presentCollection } from "../src/interaction/node-presenters.ts";
import { presentSpecimen } from "../src/svelte/catalog/compositions/specimen/specimen-presentation.ts";
import { compile } from "../src/compile.ts";
import { Notebook } from "../products/notebook/product.ts";
import type { HumanSurface } from "../src/web/types.ts";
import type { TSchema } from "@sinclair/typebox";
import { notebookScope } from "./fixtures/notebook-scope.ts";

const surface = compile(Notebook).surface("human") as HumanSurface;
const scope = notebookScope(surface);
const input = { version, kind: "input.text", name: "title", label: "Title", value: "", disabled: false, required: true } as const;

test("one bank grammar covers the exact installed catalog and every isolated specimen validates", () => {
  const kinds = (schema: TSchema): string[] => {
    if (Array.isArray(schema.anyOf)) return schema.anyOf.flatMap(kinds);
    assert.equal(typeof schema.properties?.kind?.const, "string", "Every bank branch must declare its kind");
    return [schema.properties.kind.const];
  };
  assert.deepEqual([...new Set(kinds(ResolvedNodeSchema))].sort(),
    ResolvedNodes.entries.map(entry => entry.id).sort());
  for (const entry of ResolvedNodes.entries) for (const scenario of entry.states) {
    const { nodes } = presentSpecimen(entry.id, scenario, surface, { open: false, locked: false, draft: {} }, () => true, scope);
    for (const node of nodes) assert.deepEqual(resolvedNode(node), node);
  }
  for (const entry of ControlSpecimens) for (const sample of entry.specimens) {
    const node = controlResolvedNode(sample.node);
    assert.equal(node.kind, entry.id);
    assert.ok(Object.isFrozen(node.control));
    assert.deepEqual(resolvedNode(JSON.parse(JSON.stringify(node))), node);
  }
});

test("bank descriptors reject callback, markup, style, invalid version and incompatible controls", () => {
  assert.deepEqual(resolvedNode(input), input);
  for (const extra of [{ props: {} }, { class: "p-0" }, { style: "color:red" }, { children: "<p/>" }, { onclick: () => {} }]) {
    assert.throws(() => resolvedNode({ ...input, ...extra }), /INVALID_BANK_NODE|JSON/);
  }
  assert.throws(() => resolvedNode({ ...input, version: "invented" }), /INVALID_BANK_NODE/);
  const selection = ControlSpecimens.find(entry => entry.id === 'control.select')!.specimens[0]!.node;
  assert.throws(() => resolvedNode({ version, kind: "control.date", control: selection }), /INVALID_BANK_NODE/);
  assert.throws(() => resolvedNode({ version, kind: "form", content: { kind: "form", submit: "save", fields: [
    { name: "title", primitive: "input.text", label: "Title", value: "", required: true },
    { name: "title", primitive: "input.text", label: "Duplicate", value: "", required: true },
  ] } }), /INVALID_SURFACE_FRAME_FIELDS/);
  assert.throws(() => resolvedNode({ version, kind: "context", content: { kind: "form", submit: "save", fields: [] } }), /INVALID_BANK_NODE/);
});

test("local events cannot become journey intents and dismissal cannot become primary", () => {
  assert.deepEqual(nodeEvent({ kind: "local.invoke", intent: { kind: "search.clear" } }),
    { kind: "local.invoke", intent: { kind: "search.clear" } });
  assert.throws(() => nodeEvent({ kind: "surface.invoke", intent: { kind: "search.clear" } }), /INVALID_BANK_EVENT/);
  assert.throws(() => nodeEvent({ kind: "input.change", name: "title", value: "x", callback: "submit" }), /INVALID_BANK_EVENT/);
  assert.throws(() => resolvedNode({ version, kind: "action", role: "primary",
    action: { intent: { kind: "close" }, icon: "close", label: "Close", state: "ready" } }), /INVALID_BANK_ACTION/);
});

test("collection projection carries only declared collection fields without modifying input records", () => {
  const records = [{ id: "record", version: 1, facts: { title: "Visible", state: "active", body: "Detail only", owner: "Private" } }];
  const node = presentCollection(surface, records, { loaded: true, disabled: false, selectedId: null }, scope);
  assert.deepEqual(node.records[0]!.facts, { state: "active", title: "Visible" });
  assert.equal(records[0]!.facts.owner, "Private");
  assert.throws(() => resolvedNode({ ...node, records }), /INVALID_BANK_COLLECTION/);
});
