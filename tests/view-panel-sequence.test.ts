import assert from "node:assert/strict";
import test from "node:test";
import { compile } from "../src/compile.ts";
import { Notebook } from "../products/notebook/product.ts";
import { compileViewProgram } from "../src/views/program.ts";
import type { View } from "../src/views/schema.ts";
import { humanState } from "../src/web/client/state.ts";
import { projectViewPanel } from "../src/web/client/view-projection.ts";
import { program, surface } from "./fixtures/view-program.ts";
import { viewReadScope } from "./fixtures/view-read-scope.ts";

const application = compile(Notebook);
const validate = (id: string, value: unknown) => application.validateInput(id, value).valid;
const scope = viewReadScope(program, surface, validate, program.journeys[1].id);
function sequence(view: View): View {
  return { ...view, content: [view.content[0]!, { kind: "text", text: "Before the bound content." },
    { kind: "stack", id: "details", title: "Details", items: [view.content[1] as Extract<View["content"][number], { kind: "form" | "context" }>] },
    { kind: "text", text: "After the bound content." }] };
}
const authored = { ...program, views: program.views.map(view => view.id === "editor" || view.id === "detail" ? sequence(view) : view) };
function ready() {
  const store = humanState(surface, scope);
  store.update({ availability: { contractDigest: surface.contractDigest,
    journeys: Object.fromEntries(surface.journeys.map(item => [item.id, { dependenciesReady: true, blockers: [] }])) } });
  return store;
}

test("panel Views admit the same loose leaves and titled stacks without losing authorized port cardinality", () => {
  assert.deepEqual(compileViewProgram(authored, surface).views, authored.views);
  for (const input of [
    { kind: "form", id: "other-form", input: "other" },
    { kind: "context", id: "other-context", input: "other" },
    { kind: "collection", id: "other-collection", input: "other", output: "close" },
  ]) {
    const hostile = { ...authored, views: authored.views.map(view => view.id !== "editor" ? view : { ...view, content: [...view.content, input] }) };
    assert.throws(() => compileViewProgram(hostile, surface), /INVALID_JOURNEY_VIEW_INPUTS/);
  }
  const foreignFields = { ...authored, views: authored.views.map(view => view.id !== "detail" ? view : {
    ...view, content: [view.content[0], { kind: "context", id: "detail", input: "detail", fields: ["secret"] }],
  }) };
  assert.throws(() => compileViewProgram(foreignFields, surface), /INVALID_VIEW/);
});

test("panel projection retains authored order and only canonical fields while preserving Enter submit intent", () => {
  const value = compileViewProgram(authored, surface), store = ready();
  store.update({ view: "create", draft: { title: "Title", body: "Body", secret: "Never expose" } });
  const editor = value.views.find(view => view.id === "editor")!;
  const panel = projectViewPanel(value, value.journeys[2]!, editor, surface, store.get(), validate, scope);
  assert.deepEqual(panel.body?.view.content, editor.content);
  const form = panel.body?.bindings.draft;
  assert.equal(form?.kind, "form");
  if (form?.kind !== "form") throw new Error("Missing authorized form");
  assert.deepEqual(form.content.fields.map(field => field.name), ["title", "body"]);
  assert.equal(panel.frame.content.kind, "form");
  assert.deepEqual(panel.frame.bottom.primary?.intent, { kind: "journey", journey: value.journeys[2]!.id });
  store.update({ view: "detail", selectedId: "one", detail: { id: "one", version: 1,
    facts: { title: "Saved", body: "Writing", state: "active", secret: "Never expose" } } });
  const detail = value.views.find(view => view.id === "detail")!;
  const context = projectViewPanel(value, value.journeys[1]!, detail, surface, store.get(), validate, scope);
  assert.deepEqual(context.body?.view.content, detail.content);
  assert.equal(JSON.stringify(context).includes("Never expose"), false);
});

test("pending context keeps its declared sequence and bounded waiting content, never stale facts", () => {
  const value = compileViewProgram(authored, surface), store = ready();
  store.update({ view: "detail", selectedId: "waiting", detail: null });
  const detail = value.views.find(view => view.id === "detail")!;
  const panel = projectViewPanel(value, value.journeys[1]!, detail, surface, store.get(), validate, scope);
  assert.deepEqual(panel.body?.view.content, detail.content);
  assert.deepEqual(panel.body?.pending?.detail, { kind: "message", text: "Loading…" });
  assert.deepEqual(panel.body?.bindings, {});
});

test("review and uncertain recovery never mount authored writing or extra sequence content", () => {
  const value = compileViewProgram(authored, surface);
  for (const recovery of [false, true]) {
    const store = ready();
    store.update({ view: recovery ? "recovery" : "review", uncertain: recovery,
      mutationId: value.journeys[2]!.id, prepared: { id: "original", runId: "run", journeyId: value.journeys[2]!.id,
        object: { id: "new", type: "note", expectedVersion: 0 }, facts: { title: "Title", body: "Body", state: "active" },
        confirmationDigest: "original-digest" } });
    const panel = projectViewPanel(value, value.journeys[2]!, value.views.find(view => view.id === "editor")!, surface, store.get(), validate, scope);
    assert.equal(panel.body, undefined);
    assert.equal(panel.frame.content.kind, "review");
    assert.deepEqual(panel.frame.bottom.primary?.intent, { kind: "accept" });
    assert.equal(panel.locked, recovery);
  }
});

test("an optional header does not force extra content or replace canonical operation identity", () => {
  const value = compileViewProgram({ ...authored, views: authored.views.map(view => view.id !== "editor" ? view
    : { ...view, content: view.content.filter(item => item.kind !== "header") }) }, surface);
  const store = ready(); store.update({ view: "create", draft: { title: "Title", body: "Body" } });
  const panel = projectViewPanel(value, value.journeys[2]!, value.views.find(view => view.id === "editor")!, surface, store.get(), validate, scope);
  assert.equal(panel.frame.top.title, surface.language.journeys[value.journeys[2]!.id]);
  assert.equal(panel.body?.view.content[0]?.kind, "text");
});
