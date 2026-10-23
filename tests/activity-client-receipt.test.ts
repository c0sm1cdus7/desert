import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { activityClientFixture } from "./fixtures/activity-client.ts";
import { activityModel } from "../src/web/client/activity-model.ts";
import { requireActivityJournalEntry, type ActivityHost } from "../src/web/client/activity-host.ts";
import { dispatch } from "../src/web/dispatch.ts";
import type { ControllerTransport } from "../src/web/client/transport.ts";

test("receipt journal cleanup failure keeps recovery without permitting another acceptance", async t => {
  const f = await activityClientFixture(t);
  let failClear = true, accepts = 0;
  const host: ActivityHost = { ...f.journal, clear() {
    if (failClear) throw new Error("Storage unavailable");
    f.journal.clear();
  } };
  const transport: ControllerTransport = {
    async evidence() { throw new Error("Unused"); },
    async call(method, input) { if (method === "accept") accepts++; return dispatch(f.session, method, input); },
  };
  const model = activityModel(f.surface, transport, () => {}, async () => {}, host);
  t.after(() => model.dispose());
  await model.open(f.experience); model.edit("title", "Cleanup witness"); await model.next();
  model.edit("body", "Already committed"); await model.next(); await model.accept();
  assert.equal(model.snapshot().uncertain, true);
  const entry = f.journalEntry(); assert.ok(entry?.pending);
  await model.accept(); model.close();
  assert.equal(accepts, 1); assert.deepEqual(f.journalEntry(), entry);
  failClear = false; await model.recover();
  assert.equal(accepts, 1); assert.equal(f.journalEntry(), null);
});

test("a mismatched acceptance receipt cannot clear the pending exact intent", async t => {
  const f = await activityClientFixture(t); let accepts = 0;
  const transport: ControllerTransport = {
    async evidence() { throw new Error("Unused"); },
    async call(method, input) {
      const result = await dispatch(f.session, method, input);
      if (method === "accept") { accepts++; return { ...result as object, id: randomUUID() } as never; }
      return result;
    },
  };
  const model = activityModel(f.surface, transport, () => {}, async () => {}, f.journal);
  t.after(() => model.dispose());
  await model.open(f.experience); model.edit("title", "Receipt witness"); await model.next();
  model.edit("body", "Exact operation"); await model.next();
  const intent = model.snapshot().prepared!.id;
  await model.accept();
  assert.equal(model.snapshot().uncertain, true);
  assert.equal(model.snapshot().error, "INVALID_RESPONSE");
  assert.equal(f.journalEntry()?.pending?.intentId, intent);
  await model.accept(); await model.recover();
  assert.equal(accepts, 1); assert.equal(f.journalEntry(), null);
});

test("pending journal grammar rejects private data, unknown versions and missing activity ownership", () => {
  const base = { journey: "guided", occurrence: randomUUID(), activity: randomUUID() };
  for (const value of [
    { ...base, version: "future" },
    { ...base, pending: { kind: "accept", intentId: randomUUID(), answers: { body: "Private" } } },
    { journey: base.journey, occurrence: base.occurrence, pending: { kind: "accept", intentId: randomUUID() } },
    { ...base, pending: { kind: "accept", intentId: "" } },
    { ...base, pending: { kind: "cancel", intentId: randomUUID() } },
  ]) assert.throws(() => requireActivityJournalEntry(value), /INVALID_ACTIVITY_JOURNAL/);
});
