import test from "node:test";
import assert from "node:assert/strict";
import { defineModule } from "../src/modules/definition.ts";
import { moduleCatalog } from "../src/index.ts";
import { Note, OnlyOwnerCanAccess, NotesController, CreateNote, ReadNote } from "./fixtures/notebook-domain.ts";
import { CreateNoteExperience, ReadNotesExperience, NotesDestination, NotesView, NoteView, NoteEditorView } from "./fixtures/authored-view-program.ts";
import { authorFixture } from "./fixtures/author-fixture.ts";

export const notesDefinition = {
  id: "notes", objects: [Note], dependencies: [NotesController], policies: [OnlyOwnerCanAccess],
  journeys: [
    { execution: CreateNote, presentation: CreateNoteExperience },
    { execution: ReadNote, presentation: ReadNotesExperience },
  ],
  views: [NotesView, NoteView, NoteEditorView],
  destinations: [NotesDestination],
  exports: { journeys: { createNote: CreateNote, readNotes: ReadNote }, destinations: { notes: NotesDestination }, dependencies: { NotesController } },
} as const;

test("A module registers its existing definitions without changing domain meaning", () => {
  const result = defineModule(authorFixture(notesDefinition));
  assert.deepEqual(Object.keys(result), ["id"]);
  assert.equal(result.id, "notes");
  assert.ok(Object.isFrozen(result));
});

test("Unknown module semantics and private implementation hooks are rejected", () => {
  for (const extra of [{ controller: "custom" }, { requires: ["other-module"] }, { css: "padding:0" }]) {
    assert.throws(() => defineModule({ ...notesDefinition, ...extra } as never), { message: "INVALID_MODULE_DEFINITION" });
  }
  assert.throws(() => defineModule({ ...notesDefinition, exports: { commands: ["write"] } } as never),
    { message: "INVALID_MODULE_EXPORTS" });
});

test("A module cannot export a missing identity or a different definition kind", () => {
  assert.throws(() => defineModule({ ...notesDefinition, exports: { views: { Wrong: CreateNote } } } as never),
    { message: "UNKNOWN_MODULE_EXPORT" });
  assert.throws(() => defineModule({ ...notesDefinition, exports: { journeys: { missing: { ...ReadNote, id: "missing" } } } } as never),
    { message: "UNKNOWN_MODULE_EXPORT" });
});

test("A module cannot own policy, command or dependency references belonging elsewhere", () => {
  assert.throws(() => defineModule({ ...notesDefinition, objects: [] }), { message: "FOREIGN_MODULE_OBJECT" });
  assert.throws(() => defineModule({ ...notesDefinition, dependencies: [], exports: {} } as never), { message: "FOREIGN_MODULE_DEPENDENCY" });
  const changed = { ...CreateNote, command: { ...CreateNote.command, object: "other" } };
  const read = { ...ReadNotesExperience, outputs: [
    { ...ReadNotesExperience.outputs[0], action: { kind: "journey", journey: changed } },
    ...ReadNotesExperience.outputs.slice(1),
  ] } as const;
  assert.throws(() => defineModule({ ...notesDefinition, journeys: [
    { execution: changed, presentation: CreateNoteExperience }, { execution: ReadNote, presentation: read },
  ], exports: {} }), { message: "FOREIGN_MODULE_OBJECT" });
});

test("Presentation references remain local inside a module, even if another module exports them", () => {
  const foreign = moduleCatalog([defineModule(authorFixture({ id: "elsewhere", views: [NoteEditorView],
    exports: { views: { Editor: NoteEditorView } } }))]);
  const journeys = [{ ...notesDefinition.journeys[0], presentation: {
    ...CreateNoteExperience, view: foreign.views.Editor,
  } }, notesDefinition.journeys[1]];
  assert.throws(() => defineModule({ ...notesDefinition, journeys } as never), { message: "CROSS_MODULE_REFERENCE" });
  assert.throws(() => defineModule({ ...notesDefinition, views: [NotesView, NoteView] } as never),
    { message: "UNREGISTERED_LOCAL_REFERENCE" });
});
