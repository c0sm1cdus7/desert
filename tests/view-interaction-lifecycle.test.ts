import test from "node:test";
import assert from "node:assert/strict";
import { runtimeFixture, until } from "./fixtures/view-program-runtime.ts";
import { bindViewEvents } from "../src/web/client/view-events.ts";
import type { NodeEvent } from "../src/interaction/node-events.ts";

const create: NodeEvent = { kind: "surface.invoke", intent: { kind: "view.output", view: "notes", output: "create" } };
const select = (id: string): NodeEvent => ({ kind: "surface.invoke", intent: { kind: "view.output", view: "notes", output: "select", recordId: id } });
const close: NodeEvent = { kind: "surface.invoke", intent: { kind: "close" } };
const save: NodeEvent = { kind: "surface.invoke", intent: { kind: "view.output", view: "editor", output: "save" } };
const input = (value: string): NodeEvent => ({ kind: "input.change", name: "body", value });
function deferred() { let resolve = () => {}; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; }

test("the current main output can select another record while a read panel is open", async t => {
  const { model, emit, records } = await runtimeFixture(t);
  records.push({ id: "second", version: 1, facts: { title: "Second", body: "Second body", state: "active" } });
  model.navigate("notes"); await until(() => model.snapshot().state.loaded);
  const oldMain = bindViewEvents(model.snapshot().resolved.owner, model.event);
  emit(select("existing")); await until(() => model.snapshot().state.detail?.id === "existing");
  const firstContext = model.snapshot().panel?.readingIdentity;
  assert.ok(firstContext);
  oldMain(select("second")); assert.equal(model.snapshot().state.selectedId, "existing");
  const currentMain = bindViewEvents(model.snapshot().resolved.owner, model.event);
  currentMain(close); assert.equal(model.snapshot().state.view, "detail", "main may not dismiss a different owner");
  currentMain({ kind: "surface.invoke", intent: { kind: "view.output", view: "detail", output: "close" } });
  assert.equal(model.snapshot().state.view, "detail", "main owner cannot impersonate an output of the panel view");
  currentMain(select("second"));
  await until(() => model.snapshot().state.detail?.id === "second");
  assert.notEqual(model.snapshot().panel?.readingIdentity, firstContext, "another subject never inherits reading position");
});

test("current main create preserves its read origin but main outputs cannot replace an editor", async t => {
  const { model, emit } = await runtimeFixture(t);
  model.navigate("notes"); await until(() => model.snapshot().state.loaded);
  emit(select("existing")); await until(() => model.snapshot().state.detail?.id === "existing");
  const reading = model.snapshot().panel?.readingIdentity;
  assert.ok(reading);
  const readMain = bindViewEvents(model.snapshot().resolved.owner, model.event);
  readMain(create);
  assert.equal(model.snapshot().state.view, "create");
  assert.equal(model.snapshot().state.creationOrigin, "detail");
  assert.equal(model.snapshot().panel?.readingIdentity, undefined, "a draft is not a reading context");
  const editorMain = bindViewEvents(model.snapshot().resolved.owner, model.event);
  editorMain(select("existing")); editorMain(close); readMain(create);
  assert.equal(model.snapshot().state.view, "create");
  emit(close); assert.equal(model.snapshot().state.view, "detail");
  assert.equal(model.snapshot().panel?.readingIdentity, reading, "cancellation restores the same private subject identity");
  model.navigate("home"); model.navigate("notes");
  emit(select("existing")); await until(() => model.snapshot().state.detail?.id === "existing");
  assert.notEqual(model.snapshot().panel?.readingIdentity, reading, "leaving the destination discards its suspended context");
});

test("main navigation does not override disconnected reads, review or uncertain acceptance", async t => {
  const { model, emit, connection, calls } = await runtimeFixture(t, { mode: "review", loseAcceptance: true });
  model.navigate("notes"); await until(() => model.snapshot().state.loaded);
  emit(select("existing")); await until(() => model.snapshot().state.view === "detail");
  connection.ready = false;
  await until(() => !model.snapshot().state.availability.journeys["read-note"]?.dependenciesReady);
  const offlineMain = bindViewEvents(model.snapshot().resolved.owner, model.event);
  const before = calls.length;
  offlineMain(create); offlineMain(select("existing"));
  assert.equal(model.snapshot().state.view, "detail");
  assert.equal(calls.slice(before).filter(call => call.method === "begin").length, 0);
  connection.ready = true;
  await until(() => model.snapshot().state.availability.journeys["read-note"]?.dependenciesReady === true);
  bindViewEvents(model.snapshot().resolved.owner, model.event)(create);
  emit({ kind: "input.change", name: "title", value: "Review stays owned" }); emit(input("Body")); emit(save);
  await until(() => model.snapshot().state.view === "review" && !model.snapshot().state.busy);
  const reviewMain = bindViewEvents(model.snapshot().resolved.owner, model.event);
  reviewMain(create); reviewMain(select("existing")); reviewMain(close);
  assert.equal(model.snapshot().state.view, "review");
  assert.equal(calls.filter(call => call.method === "accept").length, 0);
  emit({ kind: "surface.invoke", intent: { kind: "accept" } });
  await until(() => model.snapshot().state.uncertain && !model.snapshot().state.busy);
  const uncertainMain = bindViewEvents(model.snapshot().resolved.owner, model.event);
  uncertainMain(create); uncertainMain(select("existing")); uncertainMain(close);
  assert.equal(model.snapshot().state.uncertain, true);
  assert.equal(calls.filter(call => call.method === "accept").length, 1);
});

for (const method of ["prepare", "accept"] as const) test(`editing during ${method} preserves the newer draft without changing the accepted intent`, async t => {
  const { model, emit, records, calls } = await runtimeFixture(t);
  const arrived = deferred(), release = deferred(), request = globalThis.fetch;
  t.after(release.resolve);
  t.mock.method(globalThis, "fetch", async (url: string, init?: RequestInit) => {
    const response = await request(url, init);
    if (url.endsWith(`/api/${method}`)) { arrived.resolve(); await release.promise; }
    return response;
  });
  model.navigate("notes"); emit(create);
  emit({ kind: "input.change", name: "title", value: "Original title" }); emit(input("Original body")); emit(save);
  await arrived.promise; emit(input("Newer body"));
  assert.equal(model.snapshot().state.draft.body, "Newer body");
  release.resolve();
  await until(() => !model.snapshot().state.busy);
  if (method === "prepare") {
    assert.equal(calls.filter(call => call.method === "accept").length, 0);
    assert.equal(model.snapshot().state.view, "create");
  } else {
    assert.equal(records.at(-1)?.facts.body, "Original body");
    emit(close); emit(create);
    assert.equal(model.snapshot().state.draft.body, "Newer body");
  }
});
