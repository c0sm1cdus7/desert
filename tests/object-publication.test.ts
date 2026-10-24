import test from "node:test";
import { WorkspaceView, NavigationView } from "./fixtures/workspace-view.ts";
import assert from "node:assert/strict";
import { Check } from "@sinclair/typebox/value";
import { defineModule, moduleIndex, humanExposure, agentExposure, composeProduct, publishObject, ObjectPresentationSchema } from "../src/index.ts";
import { compile } from "../src/compile.ts";
import { ActionIconSchema } from "../src/interaction/toolbar.ts";
import { ViewNotebook as Notebook } from "./fixtures/view-exposure.ts";
import { Note, OnlyOwnerCanAccess, NotesController, ArchiveNote, CreateNote, ReadNote } from "./fixtures/notebook-domain.ts";
import { program } from "./fixtures/view-program.ts";
import { notePublication } from "./fixtures/authored-notebook.ts";
import { CreateNoteJourney, ReadNotesJourney, NotesDestination, NotesView, NoteView, NoteEditorView } from "./fixtures/authored-view-program.ts";
import { authorFixture } from "./fixtures/author-fixture.ts";
import { FixtureMessages, fixtureText, declaredFixture } from "./fixtures/messages.ts";

const presentation = { view: "detail", title: { object: "note", field: "title" }, actions: [] } as const;
const authoredPresentation = { ...presentation, view: NoteView, fields: notePublication.fields } as const;
const definition = {
  id: "notes", objects: [{ ...Note, presentation: authoredPresentation }], dependencies: [NotesController], policies: [OnlyOwnerCanAccess],
  journeys: [
    { execution: CreateNote, label: fixtureText.createNote, humanReview: "not-required", presentation: CreateNoteJourney },
    { execution: ReadNote, label: fixtureText.readNotes, presentation: ReadNotesJourney },
    { execution: ArchiveNote, label: fixtureText.archiveNote, humanReview: "required" },
  ],
  views: [NotesView, NoteView, NoteEditorView], destinations: [NotesDestination],
  exports: { journeys: { createNote: CreateNote, readNotes: ReadNote, archiveNote: ArchiveNote }, destinations: { notes: NotesDestination } },
} as const;

test("An object publishes its view without changing canonical facts or the persistence contract", () => {
  const Notes = defineModule(authorFixture(definition));
  const modules = moduleIndex([Notes]);
  const journeys = [modules.journeys.createNote, modules.journeys.readNotes, modules.journeys.archiveNote];
  const result = composeProduct({ messages: FixtureMessages, id: "notebook", label: fixtureText.notebook, modules,
    workspace: WorkspaceView, views: [WorkspaceView, NavigationView],
    exposures: [humanExposure({ id: "human", journeys, locale: "en" }), agentExposure("agent", journeys)],
    entry: modules.destinations.notes,
    navigation: [{ destination: modules.destinations.notes, group: fixtureText.explore, purpose: "content" }],
  });
  assert.deepEqual(result.definition, Notebook);
  assert.equal(compile(result.definition).digest, compile(Notebook).digest);
  assert.deepEqual(result.viewProgram.objects, [{ object: "note", ...presentation }]);
  assert.equal(result.catalog.views.filter(view => view.id === "detail").length, 1);
  assert.ok(Object.isFrozen(result.viewProgram.objects));
});

test("Object publication resolves only its own registered detail view, fields and subject journeys", () => {
  const candidate = (patch: object) => ({ ...definition, objects: [{ ...Note, presentation: { ...authoredPresentation, ...patch } }] });
  for (const [patch, message] of [
    [{ view: "missing" }, "STRING_MODULE_REFERENCE_FORBIDDEN"],
    [{ title: { object: "another", field: "title" } }, "FOREIGN_OBJECT_TITLE"],
    [{ title: { object: "note", field: "missing" } }, "UNKNOWN_OBJECT_TITLE_FIELD"],
    [{ title: { object: "note", field: "owner" } }, "INVALID_OBJECT_TITLE_FIELD"],
    [{ actions: [{ journey: "missing", icon: "edit" }] }, "STRING_MODULE_REFERENCE_FORBIDDEN"],
    [{ actions: [{ journey: CreateNote, icon: "create" }] }, "INVALID_OBJECT_SUBJECT_JOURNEY"],
    [{ actions: [{ journey: ReadNote, icon: "open" }] }, "INVALID_OBJECT_SUBJECT_JOURNEY"],
  ] as const) assert.throws(() => defineModule(candidate(patch) as never), { message });
  const actions = [{ journey: ArchiveNote, icon: "archive" }];
  const accepted = defineModule(authorFixture(candidate({ actions })));
  assert.deepEqual(Object.keys(accepted), ["id"]);
});

test("Object publication cannot inject styling, execution hooks or a second copy of a view", () => {
  for (const extra of [{ style: "padding:0" }, { class: "custom" }, { controller: "notes" }]) {
    assert.throws(() => defineModule({ ...definition, objects: [{ ...Note, presentation: { ...authoredPresentation, ...extra } }] } as never),
      { message: "INVALID_MODULE_DEFINITION" });
  }
  assert.throws(() => defineModule({ ...definition, views: [...definition.views, NoteView] }),
    { message: "DUPLICATE_MODULE_VIEWS" });
  assert.throws(() => defineModule({ ...definition, objects: [{ ...Note, presentation: { ...authoredPresentation,
    actions: [{ journey: ArchiveNote, icon: "archive" }, { journey: ArchiveNote, icon: "archive" }] } }] }),
  { message: "INVALID_MODULE_DEFINITION" });
  assert.throws(() => defineModule({ ...definition, objects: [{ ...Note, presentation: { ...authoredPresentation,
    actions: [{ journey: ArchiveNote, icon: "archive" }, { journey: ArchiveNote, icon: "close" }] } }] }),
  { message: "DUPLICATE_OBJECT_JOURNEY" });
});

test("Authoring and raw module admission preserve the same precise publication invariants", () => {
  for (const [title, message] of [
    [{ object: "another", field: "title" }, "FOREIGN_OBJECT_TITLE"],
    [{ object: "note", field: "missing" }, "UNKNOWN_OBJECT_TITLE_FIELD"],
    [{ object: "note", field: "owner" }, "INVALID_OBJECT_TITLE_FIELD"],
  ] as const) {
    assert.throws(() => publishObject(Note, { view: declaredFixture(program.views[2]), title, actions: [] } as never), { message });
    assert.throws(() => defineModule({ ...definition,
      objects: [{ ...Note, presentation: { ...authoredPresentation, title } }] } as never), { message });
  }
  for (const journey of [CreateNote, ReadNote]) {
    assert.throws(() => publishObject(Note, { view: declaredFixture(program.views[2]), title: presentation.title,
      actions: [{ journey, icon: "open" }] } as never), { message: "INVALID_OBJECT_SUBJECT_JOURNEY" });
    assert.throws(() => defineModule({ ...definition, objects: [{ ...Note, presentation: { ...authoredPresentation,
      actions: [{ journey, icon: "open" }] } }] } as never), { message: "INVALID_OBJECT_SUBJECT_JOURNEY" });
  }
  const foreign = { ...ArchiveNote, command: { ...ArchiveNote.command, object: "another" } };
  assert.throws(() => publishObject(Note, { view: declaredFixture(program.views[2]), title: presentation.title,
    actions: [{ journey: foreign, icon: "archive" }] } as never), { message: "INVALID_OBJECT_SUBJECT_JOURNEY" });
});

test("The public object presentation schema cannot be mutated or seize its icon schema owner", () => {
  const assertFrozen = (value: unknown): void => {
    if (typeof value !== "object" || value === null) return;
    assert.ok(Object.isFrozen(value));
    for (const child of Object.values(value)) assertFrozen(child);
  };
  assertFrozen(ObjectPresentationSchema);
  const action = ObjectPresentationSchema.properties.actions.items;
  assert.equal(Reflect.set(ObjectPresentationSchema, "additionalProperties", true), false);
  assert.equal(Reflect.set(action, "additionalProperties", true), false);
  assert.equal(Reflect.set(action.properties.icon.anyOf[0]!, "const", "invented"), false);
  assert.notEqual(action.properties.icon, ActionIconSchema);
  assert.equal(Object.isFrozen(ActionIconSchema), false, "Publication clones legacy schemas before freezing");
  const valid = { object: Note.id, ...presentation, actions: [{ journey: ArchiveNote.id, icon: "archive" }] };
  assert.equal(Check(ObjectPresentationSchema, valid), true);
  assert.equal(Check(ObjectPresentationSchema, { ...valid, style: "custom" }), false);
  assert.equal(Check(ObjectPresentationSchema, { ...valid, actions: [{ journey: ArchiveNote.id, icon: "invented" }] }), false);
});
