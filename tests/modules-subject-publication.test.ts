import assert from "node:assert/strict";
import test from "node:test";
import { WorkspaceView, NavigationView } from "./fixtures/workspace-view.ts";
import { composeProduct, defineModule, moduleIndex, factReference, initializeInput, publishObject, viewOutput, humanExposure, agentExposure } from "../src/index.ts";
import { compile } from "../src/compile.ts";
import { Note, OnlyOwnerCanAccess, NotesController, ArchiveNote, CreateNote, ReadNote } from "./fixtures/notebook-domain.ts";
import { EditingNotebook, EditNote } from "./fixtures/editing-notebook.ts";
import { program } from "./fixtures/view-program.ts";
import { publishedActionsFor } from "../src/views/program-bindings.ts";
import { viewExposure } from "./fixtures/view-exposure.ts";
import { notePublication } from "./fixtures/authored-notebook.ts";
import { HomeView, HomeJourney, CreateNoteJourney, ReadNotesJourney, NotesDestination,
  NotesView, NoteView, NoteEditorView } from "./fixtures/authored-view-program.ts";
import { authorFixture } from "./fixtures/author-fixture.ts";
import type { ModuleIndex, RegisteredModule, ModuleJourney } from "../src/modules/types.ts";
import { FixtureMessages, fixtureText, declaredFixture } from "./fixtures/messages.ts";

const ViewEditingNotebook = { ...EditingNotebook, surfaces: EditingNotebook.surfaces.map(viewExposure) };

const Editor = authorFixture({ ...program.views[3], id: "edit-note" } as const);
const EditPresentation = { id: EditNote.id, kind: "update", source: ReadNote,
  view: Editor, preferredDock: "right", initialize: [
    initializeInput(EditNote.command, "title", factReference(Note, "title")),
    initializeInput(EditNote.command, "body", factReference(Note, "body")),
  ], outputs: [
    { ...viewOutput(Editor, "save"), action: { kind: "submit" } },
    { ...viewOutput(Editor, "close"), action: { kind: "close" } },
  ] } as const;
const moduleSource = { id: "notes",
  objects: [publishObject(Note, { ...notePublication, actions: [{ journey: EditNote, icon: "edit" }] })],
  dependencies: [NotesController], policies: [OnlyOwnerCanAccess],
  views: [NotesView, NoteView, NoteEditorView, Editor],
  journeys: [
    { execution: CreateNote, label: fixtureText.createNote, humanReview: "not-required", presentation: { ...CreateNoteJourney, source: ReadNote } },
    { execution: ReadNote, label: fixtureText.readNotes, presentation: ReadNotesJourney },
    { execution: ArchiveNote, label: fixtureText.archiveNote, humanReview: "required" },
    { execution: EditNote, label: fixtureText.editNote, humanReview: "not-required", presentation: EditPresentation },
  ], destinations: [NotesDestination],
  exports: { journeys: { createNote: CreateNote, readNotes: ReadNote, archiveNote: ArchiveNote, editNote: EditNote },
    destinations: { notes: NotesDestination } },
} as const;
type PublicNotes = { id: "notes"; exports: typeof moduleSource.exports; journeys: readonly ModuleJourney[] };
function composition(modules: ModuleIndex<readonly [RegisteredModule<PublicNotes>]> =
  moduleIndex([defineModule(authorFixture(moduleSource))])) {
  const journeys = [modules.journeys.createNote, modules.journeys.readNotes, modules.journeys.archiveNote, modules.journeys.editNote];
  return { messages: FixtureMessages, id: EditingNotebook.id, label: fixtureText.notebook, modules,
    workspace: WorkspaceView, views: [WorkspaceView, NavigationView],
    exposures: [humanExposure({ id: "human", journeys, locale: "en" }), agentExposure("agent", journeys)],
    entry: modules.destinations.notes,
    navigation: [{ destination: modules.destinations.notes, group: fixtureText.explore, purpose: "content" }],
  } as const;
}
const wireEdit = { ...EditPresentation, source: ReadNote.id, view: Editor.id,
  outputs: EditPresentation.outputs.map(output => ({ ...output, view: Editor.id })) };

test("one object publication resolves its detail, subject operation and explicit read source through its owning module", () => {
  const source = composition();
  const home = { ...HomeJourney, outputs: [{ ...viewOutput(HomeView, "notes"),
    action: { kind: "journey", journey: source.modules.journeys.readNotes } }] } as const;
  const destination = { ...declaredFixture(program.destinations[0]), entryJourney: home } as const;
  const result = composeProduct({ ...source, views: [HomeView, ...source.views], journeys: [{ presentation: home }], destinations: [destination], entry: destination,
    navigation: [
      { destination, group: fixtureText.explore, purpose: "content" },
      ...source.navigation,
    ],
  });
  assert.deepEqual(result.definition, ViewEditingNotebook);
  assert.equal(compile(result.definition).digest, compile(ViewEditingNotebook).digest);
  assert.deepEqual(result.viewProgram.objects, [{ object: Note.id, view: "detail",
    title: { object: Note.id, field: "title" }, actions: [{ journey: EditNote.id, icon: "edit" }] }]);
  assert.deepEqual(result.viewProgram.journeys.find(item => item.id === EditNote.id), wireEdit);
  assert.equal(result.viewProgram.views.filter(item => item.id === "detail").length, 1);
  assert.ok(Object.isFrozen(result.viewProgram.objects![0]!.actions));
});

test("subject source references cannot cross module ownership or point to missing journeys", () => {
  const foreign = moduleIndex([defineModule(structuredClone({ id: "other", objects: [Note], dependencies: [NotesController],
    policies: [OnlyOwnerCanAccess], journeys: [{ execution: ReadNote }], exports: { journeys: { readNotes: ReadNote } } }))]);
  const replaceEdit = (presentation: unknown) => ({ ...moduleSource, journeys: [
    ...moduleSource.journeys.slice(0, 3), { execution: EditNote, presentation },
  ] });
  assert.throws(() => defineModule(replaceEdit({ ...EditPresentation, source: "missing" }) as never),
    { message: "STRING_MODULE_REFERENCE_FORBIDDEN" });
  assert.throws(() => defineModule(replaceEdit({ ...EditPresentation,
    source: foreign.journeys.readNotes }) as never),
  { message: "CROSS_MODULE_REFERENCE" });
  assert.throws(() => defineModule(replaceEdit({ ...EditPresentation, kind: "create" }) as never),
    { message: "INVALID_MODULE_DEFINITION" });
  const wrongKind = { ...EditPresentation, id: CreateNote.id };
  assert.throws(() => defineModule({ ...moduleSource, journeys: [
    { execution: CreateNote, presentation: wrongKind }, ...moduleSource.journeys.slice(1),
  ] } as never), { message: "MODULE_JOURNEY_KIND_MISMATCH" });
});

test("storyboard derives detail action edges without treating a subject editor as a destination", () => {
  const result = composeProduct(composition());
  const read = result.storyboard.journeys.find(item => item.id === ReadNote.id)!;
  const edit = result.storyboard.journeys.find(item => item.id === EditNote.id)!;
  const create = result.storyboard.journeys.find(item => item.id === CreateNote.id)!;
  assert.deepEqual(read.subjectActions, [{ object: "note", view: "detail", journey: "edit-note", icon: "edit" }]);
  assert.deepEqual(read.starts, ["notes"]);
  assert.deepEqual(read.outputs, program.journeys[1].outputs, "Published edges are not invented View outputs");
  assert.deepEqual(edit.starts, []);
  assert.equal(edit.source, "read-note");
  assert.equal(create.source, "read-note");
  assert.ok(Object.isFrozen(read.subjectActions));
  const readBinding = result.viewProgram.journeys.find(item => item.id === ReadNote.id)!;
  assert.deepEqual(publishedActionsFor(result.viewProgram, { ...readBinding, id: "another-read" }), [],
    "Reusing an object's detail View must not claim an action bound to a different source activity");
});

test("a zero-input subject action is published and derived without inventing an editor View", () => {
  const action = { id: ArchiveNote.id, kind: "action", source: ReadNote, outputs: [] } as const;
  const source = { ...moduleSource,
    objects: [publishObject(Note, { ...notePublication, actions: [
      { journey: EditNote, icon: "edit" }, { journey: ArchiveNote, icon: "archive" },
    ] })],
    journeys: moduleSource.journeys.map(registration => registration.execution.id === ArchiveNote.id
      ? { ...registration, presentation: action } : registration),
  } as const;
  const authored = composition(moduleIndex([defineModule(authorFixture(source))]));
  const result = composeProduct(authored);
  assert.deepEqual(result.definition, ViewEditingNotebook, "Presentation cannot manufacture a new operation");
  assert.deepEqual(result.viewProgram.journeys.find(item => item.id === ArchiveNote.id), { ...action, source: ReadNote.id });
  assert.deepEqual(authored.modules.journeys.archiveNote, { kind: "journey", owner: "notes", id: ArchiveNote.id });
  const archive = result.storyboard.journeys.find(item => item.id === ArchiveNote.id)!;
  assert.deepEqual(archive, { id: ArchiveNote.id, owner: "notes", kind: "action", source: ReadNote.id,
    starts: [], outputs: [], exposedOn: ["human", "agent"] });
  assert.deepEqual(result.storyboard.journeys.find(item => item.id === ReadNote.id)!.subjectActions, [
    { object: Note.id, view: "detail", journey: EditNote.id, icon: "edit" },
    { object: Note.id, view: "detail", journey: ArchiveNote.id, icon: "archive" },
  ]);
  assert.throws(() => defineModule({ ...source, journeys: source.journeys.map(registration =>
    registration.execution.id === ArchiveNote.id ? { execution: ArchiveNote,
      presentation: { ...action, source: "missing" } } : registration) } as never),
  { message: "STRING_MODULE_REFERENCE_FORBIDDEN" });
});
