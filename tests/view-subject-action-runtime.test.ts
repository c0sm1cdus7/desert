import test from "node:test";
import assert from "node:assert/strict";
import { subjectActionRuntime } from "./fixtures/view-subject-action-runtime.ts";
import { ArchiveNote } from "./fixtures/view-subject-actions.ts";
import { until } from "./fixtures/view-program-runtime.ts";

test("Input-free subject action prepares empty input for the selected identity and uses canonical review", async t => {
  const { model, emit, select, invoke, calls, record } = await subjectActionRuntime(t);
  assert.throws(invoke, /INVALID_VIEW_EVENT/);
  await select();
  assert.deepEqual(model.snapshot().panel?.frame.top.trailing?.map(item => [item.icon, item.state]), [["archive", "ready"]]);
  invoke();
  await until(() => model.snapshot().state.view === "review" && !model.snapshot().state.busy);
  assert.equal(model.snapshot().panel?.frame.content.kind, "review");
  assert.equal(model.snapshot().state.editing, null);
  assert.equal(record.version, 3);
  assert.deepEqual(calls.find(item => item.method === "begin" && item.input.journeyId === ArchiveNote.id)?.input,
    { journeyId: ArchiveNote.id, subject: "existing" });
  assert.deepEqual(calls.find(item => item.method === "prepare")?.input.input, {});
  assert.equal(calls.filter(item => item.method === "accept").length, 0);
  emit({ kind: "surface.invoke", intent: { kind: "back" } });
  assert.equal(model.snapshot().state.view, "detail");
  invoke();
  await until(() => model.snapshot().state.view === "review" && !model.snapshot().state.busy);
  emit({ kind: "surface.invoke", intent: { kind: "accept" } });
  await until(() => model.snapshot().state.view === "detail" && !model.snapshot().state.busy);
  assert.equal(record.facts.state, "archived");
  assert.equal(record.version, 4);
  assert.equal(model.snapshot().panel?.frame.top.trailing?.[0]?.state, "unavailable");
  assert.deepEqual(calls.find(item => item.method === "accept")?.input,
    { intentId: "archive-intent", confirmationDigest: "archive-confirmation" });
});

test("Input-free subject action honors submit mode and recovers the exact accepted operation once", async t => {
  const { model, emit, select, invoke, calls, record } = await subjectActionRuntime(t, { mode: "submit", loseAcceptance: true });
  await select(); invoke();
  await until(() => model.snapshot().state.view === "recovery" && !model.snapshot().state.busy);
  assert.equal(model.snapshot().panel?.frame.content.kind, "review");
  assert.equal(model.snapshot().panel?.frame.top.trailing?.[0]?.intent.kind, "recover");
  model.navigate("home");
  assert.equal(model.snapshot().activeDestination, "notes");
  emit({ kind: "surface.invoke", intent: { kind: "recover" } });
  await until(() => !model.snapshot().state.uncertain && !model.snapshot().state.busy);
  assert.equal(record.version, 4);
  assert.equal(calls.filter(item => item.method === "prepare").length, 1);
  assert.equal(calls.filter(item => item.method === "accept").length, 1);
  assert.deepEqual(calls.find(item => item.method === "receipt")?.input, { intentId: "archive-intent" });
});

for (const options of [{ unavailable: true }, { eligible: false }, { staleOffer: true }]) {
  test(`Subject action cannot invoke with missing controller/offer evidence: ${JSON.stringify(options)}`, async t => {
    const { model, select, invoke, calls } = await subjectActionRuntime(t, options);
    await select();
    assert.equal(model.snapshot().panel?.frame.top.trailing?.[0]?.state, "unavailable");
    invoke();
    assert.equal(calls.filter(item => item.method === "prepare").length, 0);
    assert.equal(calls.filter(item => item.method === "begin" && item.input.journeyId === ArchiveNote.id).length, 0);
    assert.equal(model.snapshot().state.view, "detail");
  });
}

test("Input-free action cannot accept a prepared effect substituted onto another subject", async t => {
  const { model, select, invoke, calls } = await subjectActionRuntime(t, { mode: "submit", wrongPreparedSubject: true });
  await select(); invoke();
  await until(() => model.snapshot().state.error !== null && !model.snapshot().state.busy);
  assert.equal(model.snapshot().state.error, "INVALID_RESPONSE");
  assert.equal(calls.filter(item => item.method === "accept").length, 0);
});
