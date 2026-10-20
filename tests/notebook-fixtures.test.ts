import assert from "node:assert/strict";
import test from "node:test";
import { Notebook } from "../products/notebook/product.ts";
import { ArchiveNote } from "../products/notebook/journeys.ts";
import { notebookDefinition } from "./fixtures/notebook.ts";
import { journeyCases, notebookCase } from "./fixtures/notebook-cases.ts";

test("compiler fixtures clone the authored product without owning another definition", () => {
  const fixture = notebookDefinition();
  assert.deepEqual(fixture, Notebook);
  fixture.objects[0].facts.title.minLength = 99;
  assert.notEqual(fixture.objects[0].facts.title.minLength, Notebook.objects[0].facts.title.minLength);
});

test("each Notebook execution case references its canonical journey entity", () => {
  assert.deepEqual(Object.keys(journeyCases), Notebook.journeys.map(journey => journey.id));
  for (const journey of Notebook.journeys) assert.equal(journeyCases[journey.id].journey, journey);
});

test("a definition change changes the derived case without editing a second fixture", () => {
  const changed = structuredClone(ArchiveNote);
  changed.command.set.state = { kind: "literal", value: "active" };
  assert.equal(notebookCase(changed).expectedState, "active");
  assert.equal(notebookCase(ArchiveNote).expectedState, "archived");
});
