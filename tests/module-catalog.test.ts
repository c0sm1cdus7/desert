import assert from "node:assert/strict";
import test from "node:test";
import { composeProduct, defineModule, viewOutput } from "../src/index.ts";
import { compile } from "../src/compile.ts";
import { CreateNote, ReadNote } from "../products/notebook/journeys.ts";
import { ViewNotebook } from "./fixtures/view-exposure.ts";
import { catalogFixture, mountModules, notesSource, NotesView } from "./fixtures/module-catalog.ts";
import { authorFixture } from "./fixtures/author-fixture.ts";

test("alias catalogs preserve canonical execution while resolving exact public definitions", () => {
  const { module, modules, source } = catalogFixture();
  const result = composeProduct(source);
  assert.deepEqual(result.definition, ViewNotebook);
  assert.equal(compile(result.definition).digest, compile(ViewNotebook).digest);
  assert.deepEqual(Object.keys(module), ["id"]);
  assert.deepEqual(Object.keys(modules.journeys), ["createNote", "readNotes", "archiveNote"]);
  assert.deepEqual(Object.keys(modules.views), ["Notes", "Note"]);
  assert.deepEqual(Object.keys(modules.commands), ["createNote", "archiveNote"]);
  assert.equal(modules.commands.createNote.id, CreateNote.command.id);
  assert.equal(Object.hasOwn(modules.commands, "readNotes"), false);
  assert.equal(Object.hasOwn(modules.views, "Editor"), false);
  assert.equal(Object.hasOwn(modules.journeys.createNote, "execution"), false);
  assert.equal(result.viewProgram.entry, "home");
  const read = result.viewProgram.journeys.find(journey => journey.id === ReadNote.id);
  assert.equal(read && "view" in read ? read.view : undefined, "notes");
  assert.ok(Object.isFrozen(modules.views));
});

test("object-preserving output references reach admission without dropping their issued identity", () => {
  const { modules } = catalogFixture();
  const output = viewOutput(modules.views.Notes, "create");
  assert.equal(output.view, modules.views.Notes);
  const local = viewOutput(NotesView, "create");
  assert.equal(local.view, NotesView);
});

test("cloned and forged mount registries are rejected before snapshots erase their provenance", () => {
  const { modules, source } = catalogFixture();
  for (const registry of [{ ...modules }, structuredClone(modules), [], {}]) {
    assert.throws(() => composeProduct({ ...source, modules: registry } as never), /UNREGISTERED_MODULE_CATALOG/);
  }
});

test("public reference tokens cannot be forged or cloned even with matching owner and identity", () => {
  const { modules, source, HomeJourney } = catalogFixture();
  for (const journey of [{ ...modules.journeys.readNotes }, structuredClone(modules.journeys.readNotes),
    { kind: "journey", owner: "notes", id: ReadNote.id }]) {
    const replacement = { ...HomeJourney, outputs: [{ ...HomeJourney.outputs[0], action: { kind: "journey", journey } }] };
    assert.throws(() => composeProduct({ ...source, journeys: [{ presentation: replacement }] } as never), /UNREGISTERED_MODULE_REFERENCE/);
  }
});

test("raw module definitions and wrong-kind handles cannot impersonate public root links", () => {
  const { modules, source, HomeJourney, owned } = catalogFixture();
  for (const [journey, error] of [[owned.journeys[1].execution, /PRIVATE_MODULE_REFERENCE/],
    [modules.views.Notes, /MODULE_REFERENCE_KIND_MISMATCH/],
    [modules.commands.createNote, /MODULE_REFERENCE_KIND_MISMATCH/],
    [ReadNote.id, /STRING_MODULE_REFERENCE_FORBIDDEN/]] as const) {
    const replacement = { ...HomeJourney, outputs: [{ ...HomeJourney.outputs[0], action: { kind: "journey", journey } }] };
    assert.throws(() => composeProduct({ ...source, journeys: [{ presentation: replacement }] } as never), error);
  }
  assert.throws(() => composeProduct({ ...source, journeys: [{ presentation: { ...HomeJourney, view: owned.views[2] } }] } as never), /PRIVATE_MODULE_REFERENCE/);
});

test("a token from an unmounted or homonymous module cannot acquire a mounted owner's authority", () => {
  const { source, HomeJourney } = catalogFixture();
  const other = mountModules([defineModule(notesSource())]);
  const replacement = { ...HomeJourney, outputs: [{ ...HomeJourney.outputs[0], action: { kind: "journey", journey: other.journeys.readNotes } }] };
  assert.throws(() => composeProduct({ ...source, journeys: [{ presentation: replacement }] } as never), /UNMOUNTED_MODULE_REFERENCE/);
});

test("module exports require exact owned objects and catalogs cannot silently overwrite aliases", () => {
  const source = notesSource();
  assert.throws(() => defineModule({ ...source, exports: { ...source.exports,
    views: { Notes: { ...NotesView } } } } as never), /UNKNOWN_MODULE_EXPORT/);
  const first = defineModule(source);
  const second = defineModule(authorFixture({ ...source, id: "other" }));
  assert.throws(() => mountModules([first, second]), /DUPLICATE_MODULE_EXPORT_ALIAS/);
});
