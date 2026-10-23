import assert from "node:assert/strict";
import test from "node:test";
import { composeProduct, defineModule } from "../src/index.ts";
import { ReadNote } from "../products/notebook/journeys.ts";
import { Note } from "../products/notebook/note.ts";
import { authoredNotebookSource, notePublication } from "./fixtures/authored-notebook.ts";
import { ViewNotebook } from "./fixtures/view-exposure.ts";

test("Authored composition requires issued references; serialized data cannot impersonate its registry", () => {
  const source = authoredNotebookSource();
  assert.deepEqual(composeProduct(source).definition, ViewNotebook);
  assert.throws(() => composeProduct(JSON.parse(JSON.stringify(source))), /UNREGISTERED_MODULE_CATALOG/);
});

test("Raw owned declarations cannot bypass publication field invariants", () => {
  const source = authoredNotebookSource();
  const title = notePublication.fields[0];
  for (const [fields, message] of [
    [[title, title], "DUPLICATE_PRESENTED_FACT"],
    [[{ ...title, fact: { object: "foreign", field: "title" } }], "FOREIGN_PRESENTED_FACT"],
    [[{ ...title, fact: { object: Note.id, field: "unknown" } }], "UNKNOWN_PRESENTED_FACT"],
    [[{ ...title, fact: { object: Note.id, field: "owner" } }], "INVALID_FACT_REPRESENTATION"],
    [[{ ...notePublication.fields[2], representation: "paragraphs" }], "INVALID_FACT_REPRESENTATION"],
  ] as const) {
    const objects = [{ ...source.objects[0], presentation: { ...source.objects[0].presentation, fields } }];
    const raw = { ...source, objects };
    assert.throws(() => composeProduct(raw as never), { message });
    const { modules, exposures, entry, navigation, label, workspace, ...module } = raw;
    assert.throws(() => defineModule(module as never), { message });
  }
});

test("Authored root maps are forbidden before a JSON snapshot can erase undefined values", () => {
  const source = authoredNotebookSource();
  for (const key of ["inputs", "fieldRepresentations", "commit", "language"]) {
    const exposures = source.exposures.map(surface => surface.kind === "human" ? { ...surface, [key]: undefined } : surface);
    assert.throws(() => composeProduct({ ...source, exposures } as never), /SURFACE_SEMANTICS_FORBIDDEN/);
  }
});

test("A read cannot quietly acquire mutation review semantics through a raw declaration", () => {
  const source = authoredNotebookSource();
  const journeys = source.journeys.map(registration => "execution" in registration && registration.execution.id === ReadNote.id
    ? { ...registration, humanReview: "required" } : registration);
  assert.throws(() => composeProduct({ ...source, journeys } as never), /INVALID_PRODUCT_COMPOSITION/);
});

