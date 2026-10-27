import test from "node:test";
import assert from "node:assert/strict";
// Compiled view data (resolved text): the contract a declared view delegates to.
import { compiledView as view } from "../src/views/view.ts";

test("Bound content declares only named ports; canonical data is supplied by its journey", () => {
  const content = [
    { kind: "collection", id: "records", input: "records", output: "select" },
    { kind: "stack", id: "editing", title: "Edit", items: [{ kind: "form", id: "editor", input: "draft" }] },
    { kind: "context", id: "record", input: "detail" },
    { kind: "visual-catalog", id: "catalog" },
  ];
  const definition = { version: "desert.view/1", id: "port-example", outputs: ["select"], content };
  assert.deepEqual(view(definition).content, content);
  for (const extra of [{ fields: ["title"] }, { schema: {} }, { command: "create-note" },
    { records: [] }, { journey: "read-note" }, { class: "custom" }]) {
    assert.throws(() => view({ ...definition, content: [{ ...content[0], ...extra }] }), { message: "INVALID_VIEW" });
  }
});

test("Collection events and data ports have unique explicit identities", () => {
  const collection = { kind: "collection", id: "records", input: "records", output: "select" };
  const definition = { version: "desert.view/1", id: "ports", outputs: ["select"], content: [collection] };
  assert.throws(() => view({ ...definition, outputs: [] }), { message: "UNDECLARED_VIEW_OUTPUT" });
  assert.throws(() => view({ ...definition, content: [collection, { kind: "form", id: "editor", input: "records" }] }),
    { message: "DUPLICATE_VIEW_INPUT" });
});
