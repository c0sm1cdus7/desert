import test from "node:test";
import assert from "node:assert/strict";
import { defineModule, composeProduct, moduleCatalog, humanSurface, agentSurface, viewOutput } from "../src/index.ts";
import { compile } from "../src/compile.ts";
import { Notebook } from "../products/notebook/product.ts";
import { Note, OnlyOwnerCanAccess, NotesController, ArchiveNote, CreateNote, ReadNote } from "./fixtures/notebook-domain.ts";
import { program } from "./fixtures/view-program.ts";
import { HomeView, HomeJourney, NotesView, NoteView, NoteEditorView, CatalogView, CatalogJourney,
  CreateNoteExperience, ReadNotesExperience, NotesDestination, CatalogDestination } from "./fixtures/authored-view-program.ts";
import { ViewNotebook } from "./fixtures/view-exposure.ts";
import { publishedNotebookNote } from "./fixtures/authored-notebook.ts";
import type { RegisteredModule, ModuleJourney } from "../src/modules/types.ts";
import { WorkspaceView, NavigationView } from "./fixtures/workspace-view.ts";
import { authorFixture } from "./fixtures/author-fixture.ts";

const notesSource = {
  id: "notes", objects: [publishedNotebookNote()], dependencies: [NotesController], policies: [OnlyOwnerCanAccess],
  journeys: [
    { execution: CreateNote, label: "Create note", humanReview: "not-required", presentation: CreateNoteExperience },
    { execution: ReadNote, label: "Read notes", presentation: ReadNotesExperience },
    { execution: ArchiveNote, label: "Archive note", humanReview: "required" },
  ], views: [NotesView, NoteView, NoteEditorView], destinations: [NotesDestination],
  exports: { journeys: { createNote: CreateNote, readNotes: ReadNote, archiveNote: ArchiveNote },
    destinations: { notes: NotesDestination }, dependencies: { NotesController } },
} as const;
const Notes = defineModule(notesSource);
const Catalog = defineModule({ id: "catalog", views: [CatalogView], journeys: [{ presentation: CatalogJourney }],
  destinations: [CatalogDestination], exports: { destinations: { catalog: CatalogDestination } } });
type PublicNotes = { id: "notes"; exports: typeof notesSource.exports; journeys: readonly ModuleJourney[] };
function root(notes: RegisteredModule<PublicNotes> = Notes) {
  const modules = moduleCatalog([notes, Catalog]);
  const journeys = [modules.journeys.createNote, modules.journeys.readNotes, modules.journeys.archiveNote];
  const home = { ...HomeJourney, outputs: [{ ...viewOutput(HomeView, "notes"),
    action: { kind: "journey", journey: modules.journeys.readNotes } }] } as const;
  const destination = { ...program.destinations[0], entryJourney: home } as const;
  return { id: Notebook.id, label: "Notebook", modules,
    surfaces: [humanSurface({ id: "human", journeys, locale: "en" }), agentSurface("agent", journeys)],
    workspace: WorkspaceView, views: [HomeView, WorkspaceView, NavigationView],
    journeys: [{ presentation: home }], destinations: [destination], entry: destination,
    navigation: [
      { ...program.navigation[0], destination },
      { ...program.navigation[1], destination: modules.destinations.notes },
      { ...program.navigation[2], destination: modules.destinations.catalog },
    ],
  } as const;
}

test("One product composition derives execution exposure without a second navigation owner", () => {
  const source = root(), result = composeProduct(source);
  assert.deepEqual(result.definition, ViewNotebook);
  assert.equal(compile(result.definition).digest, compile(ViewNotebook).digest);
  assert.equal(Object.hasOwn(compile(result.definition).surface("human"), "navigation"), false);
  assert.deepEqual(result.viewProgram.navigation, program.navigation);
  assert.deepEqual(result.viewProgram.journeys.map(item => item.id), ["create-note", "read-note", "catalog", "home"]);
  assert.equal(source.modules.journeys.createNote.id, CreateNote.id);
  assert.equal(source.modules.dependencies.NotesController.id, NotesController.id);
  assert.deepEqual(Object.keys(Notes), ["id"]);
  assert.ok(Object.isFrozen(result.definition.objects));
  assert.ok(Object.isFrozen(result.storyboard.journeys));
});

test("Catalog and storyboard are derived from owned declarations and real output bindings", () => {
  const result = composeProduct(root());
  assert.deepEqual(result.catalog.modules, ["notes", "catalog"]);
  assert.deepEqual(result.catalog.commands, [
    { id: CreateNote.command.id, owner: "notes", journeys: [CreateNote.id] },
    { id: ArchiveNote.command.id, owner: "notes", journeys: [ArchiveNote.id] },
  ]);
  const home = result.storyboard.journeys.find(item => item.id === "home")!;
  assert.deepEqual(home.starts, ["home"]);
  assert.deepEqual(home.outputs, program.journeys[0].outputs);
  assert.deepEqual(result.storyboard.journeys.find(item => item.id === ArchiveNote.id), {
    id: ArchiveNote.id, owner: "notes", kind: "execution-only", starts: [], outputs: [], exposedOn: ["human", "agent"],
  });
});

test("Root cross-module links require issued handles, not raw definitions or matching strings", () => {
  const source = root();
  const change = (journey: unknown) => ({ ...source, journeys: [{ presentation: {
    ...source.journeys[0].presentation, outputs: [{ ...viewOutput(HomeView, "notes"), action: { kind: "journey", journey } }],
  } }] });
  assert.throws(() => composeProduct(change(ReadNote) as never), /PRIVATE_MODULE_REFERENCE/);
  assert.throws(() => composeProduct(change(ReadNote.id) as never), /STRING_MODULE_REFERENCE_FORBIDDEN/);
  assert.throws(() => composeProduct(change(source.modules.journeys.archiveNote) as never), /UNPRESENTED_MODULE_JOURNEY/);
  assert.throws(() => composeProduct({ ...source, navigation: program.navigation } as never), /STRING_MODULE_REFERENCE_FORBIDDEN/);
});

test("Forged, absent and duplicated module registrations fail before a surface mounts", () => {
  const source = root();
  assert.throws(() => moduleCatalog([{ ...Notes }, Catalog] as never), /UNREGISTERED_MODULE_HANDLE/);
  assert.throws(() => moduleCatalog([Notes, Notes, Catalog]), /DUPLICATE_MODULE_ID/);
  assert.throws(() => composeProduct({ ...source, modules: moduleCatalog([Notes]) } as never), /UNMOUNTED_MODULE_REFERENCE/);
  assert.throws(() => composeProduct({ ...source, entry: { kind: "destination", owner: "catalog", id: "notes" } } as never),
    /UNREGISTERED_MODULE_REFERENCE/);
  assert.throws(() => composeProduct({ ...source, padding: 0 } as never), /INVALID_PRODUCT_COMPOSITION/);
});

test("Module exposure and view semantics are checked before composition returns", () => {
  const source = root();
  const surfaces = [humanSurface({ id: "human", journeys: [CreateNote, ReadNote, ArchiveNote], locale: "en" })];
  assert.throws(() => composeProduct({ ...source, surfaces }), /PRIVATE_MODULE_REFERENCE/);
  const home = { ...source.journeys[0].presentation, outputs: [] } as const;
  const destination = { ...source.destinations[0], entryJourney: home };
  assert.throws(() => composeProduct({ ...source, journeys: [{ presentation: home }], destinations: [destination],
    entry: destination, navigation: [{ ...source.navigation[0], destination }] }), /UNBOUND_VIEW_OUTPUT/);
});

test("A capability publishes execution without requiring a view", () => {
  const headless = defineModule(structuredClone({ id: "headless", objects: [Note], dependencies: [NotesController],
    policies: [OnlyOwnerCanAccess], journeys: [{ execution: CreateNote }], exports: { journeys: { createNote: CreateNote } } }));
  assert.equal(moduleCatalog([headless]).journeys.createNote.id, CreateNote.id);
  assert.equal("views" in headless, false);
});

test("Repeated command use has one derived catalog identity with every consuming journey", () => {
  const anotherActivity = { ...CreateNote, id: "another-create-activity" };
  const shared = defineModule(authorFixture({ ...notesSource, journeys: [...notesSource.journeys, { execution: anotherActivity }] }));
  const result = composeProduct(root(shared));
  const command = result.catalog.commands.find(item => item.id === CreateNote.command.id)!;
  assert.deepEqual(command.journeys, [CreateNote.id, anotherActivity.id]);
  assert.equal(result.catalog.commands.filter(item => item.id === CreateNote.command.id).length, 1);
  assert.deepEqual(result.storyboard.journeys.find(item => item.id === anotherActivity.id)?.exposedOn, []);
});
