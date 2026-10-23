import assert from "node:assert/strict";
import test from "node:test";
import { captureViewEvents } from "./fixtures/owned-view-events.ts";
import { runtimeFixture, until } from "./fixtures/view-program-runtime.ts";
import { multiViewRuntime, until as untilMulti } from "./fixtures/multi-view-runtime.ts";
import type { NodeEvent } from "../src/interaction/node-events.ts";

const input = (value: string): NodeEvent => ({ kind: "input.change", name: "title", value });
const close: NodeEvent = { kind: "surface.invoke", intent: { kind: "close" } };
const back: NodeEvent = { kind: "surface.invoke", intent: { kind: "back" } };
const save: NodeEvent = { kind: "surface.invoke", intent: { kind: "view.output", view: "editor", output: "save" } };
const accept: NodeEvent = { kind: "surface.invoke", intent: { kind: "accept" } };
const create: NodeEvent = { kind: "surface.invoke", intent: { kind: "view.output", view: "notes", output: "create" } };
const body: NodeEvent = { kind: "input.change", name: "body", value: "Current body" };

test("late events from a Note editor cannot change a newer Card editor", async t => {
  const f = await multiViewRuntime(t);
  f.model.navigate("notes"); await untilMulti(() => f.model.snapshot().state.loaded);
  f.output("notes", "create");
  const oldNote = captureViewEvents(f.model);
  f.emit(close); f.model.navigate("cards"); await untilMulti(() => f.model.snapshot().state.loaded);
  f.output("cards", "create"); f.input("title", "Current Card"); f.input("body", "Card body");
  oldNote(input("Late Note blur"));
  assert.equal(f.model.snapshot().state.draft.title, "Current Card");
  oldNote(close); oldNote(back);
  assert.equal(f.model.snapshot().state.view, "create");
  assert.equal(f.model.snapshot().state.creationJourneyId, "create-card");
  assert.equal(await f.receipts(), 0);
});

test("reopening the same editor invalidates old changes, dismissal and submit events", async t => {
  const { model, emit, calls } = await runtimeFixture(t, { mode: "review" });
  model.navigate("notes"); emit(create);
  const oldEditor = captureViewEvents(model);
  emit(close); emit(create); emit(input("New instance")); emit(body);
  oldEditor(input("Old instance")); oldEditor(close); oldEditor(back); oldEditor(save);
  assert.equal(model.snapshot().state.draft.title, "New instance");
  assert.equal(model.snapshot().state.view, "create");
  assert.equal(calls.filter(call => call.method === "prepare").length, 0);
  emit(save); await until(() => model.snapshot().state.view === "review" && !model.snapshot().state.busy);
  assert.equal(calls.filter(call => call.method === "prepare").length, 1);
});

test("an old review cannot accept or dismiss a later prepared operation", async t => {
  const { model, emit, calls, records } = await runtimeFixture(t, { mode: "review" });
  model.navigate("notes"); emit(create); emit(input("First")); emit(body); emit(save);
  await until(() => model.snapshot().state.view === "review" && !model.snapshot().state.busy);
  const oldReview = captureViewEvents(model);
  emit(back); emit(close); emit(create); emit(input("Second")); emit(save);
  await until(() => model.snapshot().state.view === "review" && !model.snapshot().state.busy);
  oldReview(accept); oldReview(close); oldReview(back);
  assert.equal(calls.filter(call => call.method === "accept").length, 0);
  assert.equal(model.snapshot().state.view, "review");
  emit(accept); await until(() => model.snapshot().state.view === "detail" && !model.snapshot().state.busy);
  assert.equal(calls.filter(call => call.method === "accept").length, 1);
  assert.equal(records.at(-1)?.facts.title, "Second");
});

test("retained main-view actions and disposed render callbacks cannot reopen an editor", async t => {
  const { model, emit } = await runtimeFixture(t);
  model.navigate("notes");
  const oldMain = captureViewEvents(model);
  emit(create); emit(close); oldMain(create);
  assert.equal(model.snapshot().state.view, "list");
  const currentMain = captureViewEvents(model);
  model.stop(); currentMain(create);
  assert.equal(model.snapshot().state.view, "list");
});
