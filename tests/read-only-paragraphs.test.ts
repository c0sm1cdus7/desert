import assert from "node:assert/strict";
import test from "node:test";
import { WorkspaceView, NavigationView } from "./fixtures/workspace-view.ts";
import { composeProduct, factReference, humanExposure, moduleIndex, ownershipPolicy, publishObject, viewOutput, Components, ViewTitles, defineView, viewPorts, type AuthoredViewJourney } from "../src/index.ts";
import { compile } from "../src/compile.ts";
import { Note, ReadNote, NotesController } from "./fixtures/notebook-domain.ts";
import { Notebook } from "../products/notebook/product.ts";
import { presentFacts } from "../src/interaction/fact-presentation.ts";
import { humanState } from "../src/web/client/state.ts";
import { presentFrame } from "../src/web/client/frame.ts";
import { projectView } from "../src/web/client/view-projection.ts";
import type { HumanSurface } from "../src/web/types.ts";
import { viewReadScope } from "./fixtures/view-read-scope.ts";

const Ports = viewPorts({ inputs: { notes: "collection", note: "context" }, outputs: ["select", "close"] });
const NotesView = defineView({
  name: "read-only-notes", outputs: ["select"],
  content: [
    Components.Header({ title: "Notes", subtitle: "Read your notes." }),
    Components.Collection({ input: Ports.inputs.notes, output: Ports.output.select }),
  ],
});
const NoteView = defineView({
  name: "read-only-note", outputs: ["close"],
  topDock: Components.Toolbar({ actions: [{ output: "close", label: "Close", icon: "close" }] }),
  content: [
    Components.Header({ title: ViewTitles.subject, subtitle: "Read your note." }),
    Components.Context({ input: Ports.inputs.note }),
  ],
});
const ReadNotes = {
  id: ReadNote.id, kind: "read", view: NotesView, detailView: NoteView,
  outputs: [
    { ...viewOutput(NotesView, "select"), action: { kind: "select" } },
    { ...viewOutput(NoteView, "close"), action: { kind: "close" } },
  ],
} as const satisfies AuthoredViewJourney;
const NotesDestination = { id: "notes", label: "Notes", icon: "open", entryJourney: ReadNote } as const;

function readOnlyNotebook() {
  return {
    id: "read-only-notebook", label: "Read-only Notebook", modules: moduleIndex([]),
    objects: [publishObject(Note, {
      view: NoteView, title: factReference(Note, "title"), actions: [],
      fields: [
        { fact: factReference(Note, "title"), label: "Title", representation: "text" },
        { fact: factReference(Note, "body"), label: "Content", representation: "paragraphs" },
        { fact: factReference(Note, "state"), label: "Status", representation: "text" },
      ],
    })],
    dependencies: [NotesController],
    policies: [ownershipPolicy(Note, "owner")],
    journeys: [{ execution: ReadNote, label: "Read notes", presentation: ReadNotes }],
    exposures: [humanExposure({ id: "human", journeys: [ReadNote], locale: "en" })],
    workspace: WorkspaceView, views: [NotesView, NoteView, WorkspaceView, NavigationView], destinations: [NotesDestination], entry: NotesDestination,
    navigation: [{ destination: NotesDestination, group: "Explore", purpose: "content" }],
  } as const;
}

test("A read-only publication renders paragraphs without acquiring any mutation authority", () => {
  const composition = composeProduct(readOnlyNotebook());
  const application = compile(composition.definition);
  const surface = application.surface("human") as HumanSurface;
  assert.deepEqual(composition.definition.journeys?.map(journey => journey.kind), ["read"]);
  assert.deepEqual(surface.journeys.map(journey => journey.kind), ["read"]);
  assert.equal(surface.journeys.some(journey => Object.hasOwn(journey, "inputFields")), false);
  assert.deepEqual(surface.commit, {});
  assert.equal(Object.hasOwn(surface, "navigation"), false);

  const scope = viewReadScope(composition.viewProgram, surface, () => true, ReadNote.id);
  assert.deepEqual(scope.creations, []);
  assert.deepEqual(scope.subjectActions, []);
  const initial = humanState(surface, scope).get();
  assert.equal(initial.creationJourneyId, null);
  assert.deepEqual(initial.draft, {});
  const state = { ...initial, view: "detail" as const,
    detail: { id: "first", version: 1, facts: { title: "A note", body: "First.\n\nSecond.", state: "active" } } };
  const program = composition.viewProgram;
  const journey = program.journeys.find(journey => journey.id === ReadNote.id)!;
  const view = program.views.find(view => view.id === NoteView.id)!;
  const resolved = projectView(program, journey, view, surface, state, () => true, scope);
  assert.equal(resolved.top?.title, "A note");
  const context = resolved.bindings.note;
  assert.equal(context?.kind, "context");
  if (context?.kind !== "context") throw new Error("CONTEXT_REQUIRED");
  assert.deepEqual(context.content.details.multiline, ["body"]);
  const editableSurface = compile(Notebook).surface("human") as HumanSurface;
  assert.deepEqual(context.content.details.multiline,
    presentFacts(editableSurface, Note.id, ["body", "state"], state.detail.facts).multiline,
    "Removing all mutation exposure does not change reading representation");
  assert.deepEqual(context.content.details.fields, ["body", "state"]);
  assert.equal(context.content.details.facts.body, state.detail.facts.body);
  assert.deepEqual(context.content.actions, []);
  assert.equal(resolved.top?.trailing?.length, 0);
  assert.throws(() => presentFrame(surface, { ...state, view: "create" }, () => true, scope), /FORM_JOURNEY_REQUIRED/);
});

test("A read-only exposure cannot provide its own field or input presentation maps", () => {
  const source = readOnlyNotebook();
  const exposure = source.exposures[0];
  for (const map of [
    { inputs: { "note.body": "input.multiline" } },
    { fieldRepresentations: { "note.body": "text" } },
    { language: { locale: "en", fields: { "note.body": "Other content" }, journeys: {} } },
    { commit: { "create-note": "submit" } },
  ]) {
    assert.throws(() => composeProduct({ ...source, exposures: [{ ...exposure, ...map }] } as never),
      /SURFACE_SEMANTICS_FORBIDDEN/);
  }
  for (const key of ["inputs", "fieldRepresentations"]) {
    assert.throws(() => composeProduct({ ...source, exposures: [{ ...exposure, [key]: undefined }] } as never),
      /SURFACE_SEMANTICS_FORBIDDEN/);
  }
});
