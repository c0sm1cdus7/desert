import test from "node:test";
import assert from "node:assert/strict";
import { program } from "./fixtures/view-program.ts";
import { runtimeFixture, until } from "./fixtures/view-program-runtime.ts";

const output = (view: string, port: string, recordId?: string) => ({ kind: "surface.invoke" as const,
  intent: { kind: "view.output" as const, view, output: port, ...(recordId ? { recordId } : {}) } });

test("Presentation destinations do not read or write; unknown and hidden outputs are rejected", async t => {
  const { model, emit, calls } = await runtimeFixture(t);
  assert.equal(model.snapshot().activeDestination, "home");
  assert.equal(model.snapshot().state.creationJourneyId, null, "Home cannot borrow a read scope's creation identity");
  assert.deepEqual(calls.map(item => item.method), ["availability"]);
  model.navigate("catalog");
  assert.throws(() => emit(output("home", "notes")), /UNKNOWN_VIEW_OUTPUT/);
  assert.throws(() => emit(output("editor", "save")), /UNKNOWN_VIEW_OUTPUT/);
  assert.throws(() => emit(output("notes", "create")), /UNKNOWN_VIEW_OUTPUT/);
  assert.throws(() => emit(output("catalog", "invented")), /UNKNOWN_VIEW_OUTPUT/);
  assert.deepEqual(calls.map(item => item.method), ["availability"]);
});

test("Authored disabled creation cannot run when its port is dispatched directly", async t => {
  const definition = structuredClone(program) as unknown as Record<string, any>;
  definition.views[1].topDock.actions[0].disabled = true;
  const { model, emit, calls } = await runtimeFixture(t, { definition });
  model.navigate("notes");
  await until(() => model.snapshot().state.loaded);
  const before = calls.length;
  emit(output("notes", "create"));
  assert.equal(model.snapshot().state.view, "list");
  assert.equal(calls.length, before);
});

test("Form Enter uses only the visible canonical create binding and submission returns to Notes", async t => {
  const { model, emit, records } = await runtimeFixture(t);
  model.navigate("notes");
  await until(() => model.snapshot().state.loaded);
  emit(output("notes", "create"));
  emit({ kind: "input.change", name: "title", value: "Created through a View" });
  emit({ kind: "input.change", name: "body", value: "Canonical command inputs" });
  emit({ kind: "surface.invoke", intent: { kind: "journey", journey: program.journeys[2].id } });
  await until(() => model.snapshot().state.view === "detail" && !model.snapshot().state.busy);
  assert.equal(records.length, 2);
  assert.equal(records[1]?.facts.title, "Created through a View");
  assert.equal(model.snapshot().activeDestination, "notes");
  assert.throws(() => emit({ kind: "surface.invoke", intent: { kind: "journey", journey: program.journeys[2].id } }), /INVALID_VIEW_EVENT/);
});

test("Review cannot be bypassed by a stale editor output, and Back returns to its draft", async t => {
  const { model, emit, calls } = await runtimeFixture(t, { mode: "review" });
  model.navigate("notes"); emit(output("notes", "create"));
  emit({ kind: "input.change", name: "title", value: "Review me" });
  emit({ kind: "input.change", name: "body", value: "Keep my draft" });
  emit(output("editor", "save"));
  await until(() => model.snapshot().state.view === "review" && !model.snapshot().state.busy);
  const before = calls.length;
  assert.throws(() => emit(output("editor", "save")), /UNKNOWN_VIEW_OUTPUT/);
  assert.equal(calls.length, before);
  emit({ kind: "surface.invoke", intent: { kind: "back" } });
  assert.equal(model.snapshot().state.view, "create");
  assert.deepEqual(model.snapshot().state.draft, { title: "Review me", body: "Keep my draft" });
  assert.equal(calls.filter(item => item.method === "accept").length, 0);
});

test("Lost acceptance retains the same recovery operation and navigation cannot abandon it", async t => {
  const { model, emit, calls, records } = await runtimeFixture(t, { loseAcceptance: true });
  model.navigate("notes"); emit(output("notes", "create"));
  emit({ kind: "input.change", name: "title", value: "Accepted once" });
  emit({ kind: "input.change", name: "body", value: "Recover me" });
  emit(output("editor", "save"));
  await until(() => model.snapshot().state.uncertain && !model.snapshot().state.busy);
  model.navigate("home");
  assert.equal(model.snapshot().activeDestination, "notes");
  emit({ kind: "input.change", name: "body", value: "Must not edit recovery" });
  assert.equal(model.snapshot().state.draft.body, "Recover me");
  emit({ kind: "surface.invoke", intent: { kind: "recover" } });
  await until(() => !model.snapshot().state.uncertain && !model.snapshot().state.busy);
  assert.equal(records.length, 2);
  assert.equal(calls.filter(item => item.method === "accept").length, 1);
  assert.deepEqual(calls.find(item => item.method === "receipt")?.input, { intentId: "original-intent" });
});
