import assert from "node:assert/strict";
import test from "node:test";
import { compileViewProgram } from "../src/views/program.ts";
import { humanState } from "../src/web/client/state.ts";
import { projectViewPanel } from "../src/web/client/view-projection.ts";
import { multiApplication, multiProgram, multiSurface } from "./fixtures/multi-view-program.ts";
import { viewReadScope } from "./fixtures/view-read-scope.ts";

const validate = (id: string, value: unknown) => multiApplication.validateInput(id, value).valid;
const program = compileViewProgram(multiProgram, multiSurface);
const scope = viewReadScope(program, multiSurface, validate, "read-note");
function state() {
  const store = humanState(multiSurface, scope);
  store.update({ view: "detail", selectedId: "note-one", detail: { id: "note-one", version: 3,
    facts: { title: "Author's title", body: "Author's body", state: "active" } },
    availability: { contractDigest: multiSurface.contractDigest, journeys: Object.fromEntries(
      multiSurface.journeys.map(item => [item.id, { dependenciesReady: true, blockers: [] }])) },
    offers: { "edit-note": { journeyId: "edit-note", subject: "note-one", version: 3, eligible: true } },
  });
  return store;
}

test("the same semantic operation header resolves create and edit labels without changing the declaration", () => {
  const store = state();
  store.update({ view: "create", draft: { title: "New", body: "Body" } });
  const create = program.journeys.find(item => item.id === "create-note")!;
  assert.equal(create.kind, "create");
  if (create.kind !== "create") throw new Error("Expected create binding");
  const createView = program.views.find(item => item.id === create.view)!;
  assert.equal(projectViewPanel(program, create, createView, multiSurface, store.get(), validate, scope).frame.top.title, "Create note");
  store.update({ view: "edit", editing: { journeyId: "edit-note", subject: "note-one", expectedVersion: 3,
    facts: store.get().detail!.facts, creationDraft: { draft: {}, draftRevision: 0, touchedFields: [] } } });
  const edit = program.journeys.find(item => item.id === "edit-note")!;
  assert.equal(edit.kind, "update");
  if (edit.kind !== "update") throw new Error("Expected update binding");
  const editView = program.views.find(item => item.id === edit.view)!;
  assert.equal(projectViewPanel(program, edit, editView, multiSurface, store.get(), validate, scope).frame.top.title, "Edit note");
  assert.deepEqual(editView.content[0]?.kind === "header" && editView.content[0].title, { kind: "operation-label" });
});

test("literal object headers remain literal and publication icons are authored data", () => {
  const authored = { ...multiProgram,
    objects: multiProgram.objects.map(object => ({ ...object, actions: [{ journey: "edit-note", icon: "review" as const }] })),
    views: multiProgram.views.map(view => view.id !== "detail" ? view : { ...view,
      content: view.content.map(item => item.kind === "header" ? { ...item, title: "Deliberate literal title" } : item) }),
  };
  const compiled = compileViewProgram(authored, multiSurface);
  const read = compiled.journeys.find(item => item.id === "read-note")!;
  const detail = compiled.views.find(item => item.id === "detail")!;
  const panel = projectViewPanel(compiled, read, detail, multiSurface, state().get(), validate, scope);
  assert.equal(panel.frame.top.title, "Deliberate literal title");
  assert.equal(panel.frame.top.trailing?.[0]?.icon, "review");
  assert.equal(panel.frame.content.kind, "context");
  if (panel.frame.content.kind === "context") assert.equal(panel.frame.content.details.facts.title, "Author's title");
});

test("subject-title opts into authorized title placement without duplicating it in body facts", () => {
  const read = program.journeys.find(item => item.id === "read-note")!;
  const detail = program.views.find(item => item.id === "detail")!;
  const panel = projectViewPanel(program, read, detail, multiSurface, state().get(), validate, scope);
  assert.equal(panel.frame.top.title, "Author's title");
  assert.equal(panel.frame.content.kind, "context");
  if (panel.frame.content.kind === "context") assert.deepEqual(panel.frame.content.details.fields, ["body", "state"]);
});

test("a shared object detail only publishes actions bound to its current read source", () => {
  const canonical = multiSurface.journeys.find(item => item.id === "read-note")!;
  const surface = { ...multiSurface, journeys: [...multiSurface.journeys, { ...canonical, id: "other-notes" }] };
  const source = multiProgram.journeys.find(item => item.id === "read-note")!;
  const candidate = { ...multiProgram,
    journeys: [...multiProgram.journeys.map(item => item.id === "create-note" ? { ...item, source: "read-note" } : item),
      { ...source, id: "other-notes" }],
    destinations: [...multiProgram.destinations, { id: "other", label: "Other notes", icon: "open", entryJourney: "other-notes" }],
    navigation: [...multiProgram.navigation, { destination: "other", group: "Explore", purpose: "content" as const }],
  };
  const compiled = compileViewProgram(candidate, surface);
  const definition = compiled.views.find(item => item.id === "detail")!;
  for (const [id, expected] of [["read-note", ["edit-note"]], ["other-notes", []]] as const) {
    const read = compiled.journeys.find(item => item.id === id)!;
    const readScope = viewReadScope(compiled, surface, validate, id);
    const panel = projectViewPanel(compiled, read, definition, surface, state().get(), validate, readScope);
    assert.deepEqual(panel.frame.top.trailing?.flatMap(action => action.intent.kind === "journey" ? [action.intent.journey] : []), expected);
  }
});
