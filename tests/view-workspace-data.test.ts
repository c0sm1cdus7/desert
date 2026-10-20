import assert from "node:assert/strict";
import test from "node:test";
import { viewIdentity, viewSearchResults, viewSearchSelection } from "../src/svelte/views/workspace-data.ts";
import type { ResolvedView } from "../src/views/resolved.ts";
import { program } from "./fixtures/view-program.ts";

const resolved: ResolvedView = { view: program.views[1], disabledOutputs: [], bindings: {
  records: { version: "desert.bank-node/1", kind: "collection", object: "note", fields: ["title"],
    labels: { "note.title": "Title" }, createLabel: "New note", loaded: true, disabled: false, selectedId: null,
    records: [{ id: "record-1", version: 1, facts: { title: "A private thought" } }] },
} };

test("workspace adaptation preserves authored identity and projects only authorized collection values", () => {
  assert.equal(viewIdentity(resolved, "Fallback"), resolved.view.content[0]);
  assert.deepEqual(viewSearchResults(resolved, "  "), []);
  const results = viewSearchResults(resolved, "private thought");
  assert.equal(results.length, 1);
  assert.ok(results[0]?.kind === "content");
  assert.equal(results[0].title, "A private thought");
  assert.deepEqual(viewSearchSelection(resolved, results[0]!.id), { kind: "surface.invoke", intent: {
    kind: "view.output", view: "notes", output: "select", recordId: "record-1",
  } });
  assert.equal(viewSearchSelection({ ...resolved, disabledOutputs: ["select"] }, results[0]!.id), null);
  assert.equal(viewSearchSelection(resolved, "unknown"), null);
});

test("catalog search reuses the canonical registered entry inventory", () => {
  const catalog = { ...resolved, view: program.views[4] };
  assert.ok(viewSearchResults(catalog, "date").some(item => item.kind === "bank" && item.id === "control.date"));
  assert.equal(viewSearchSelection(catalog, "control.date"), null);
});
