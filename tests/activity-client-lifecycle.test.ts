import test from "node:test";
import assert from "node:assert/strict";
import { activityClientFixture } from "./fixtures/activity-client.ts";
import { activityModel } from "../src/web/client/activity-model.ts";
import { ActivityJournalVersion } from "../src/web/client/activity-host.ts";
import { TransportError, type ControllerTransport } from "../src/web/client/transport.ts";
import { dispatch } from "../src/web/dispatch.ts";
import { projectActivityPanel } from "../src/web/client/activity-projection.ts";
import { humanState } from "../src/web/client/state.ts";
import { transientFrame } from "../src/interaction/transient-frame.ts";

test("pending acceptance survives an unavailable activity read and remains recoverable without its snapshot", async t => {
  const f = await activityClientFixture(t), saved = await f.seed("Accepted before disconnect");
  const answered = await f.session.activityAnswer(saved.activity.id, saved.activity.revision, 1, { body: "Private answer" });
  const prepared = await f.session.activityPrepare(answered.id, answered.revision);
  const expected = await f.session.accept(prepared.intent.id, prepared.intent.confirmationDigest);
  f.journal.save({ version: ActivityJournalVersion, journey: f.experience.id, occurrence: saved.occurrence,
    activity: saved.activity.id, pending: { kind: "accept", intentId: prepared.intent.id } });
  const entry = f.journalEntry(); let unavailable = true, completed: unknown, accepts = 0;
  const transport: ControllerTransport = {
    async evidence() { throw new Error("Unused"); },
    async call(method, input) {
      if (method === "activityRead" && unavailable) throw new TransportError("CONNECTION_LOST");
      if (method === "accept") accepts++;
      return dispatch(f.session, method, input);
    },
  };
  const model = activityModel(f.surface, transport, () => {}, async (_, receipt) => { completed = receipt; }, f.journal);
  t.after(() => model.dispose());
  await model.open(f.experience);
  assert.equal(model.snapshot().activity, null); assert.equal(model.snapshot().uncertain, true);
  model.close(); assert.deepEqual(f.journalEntry(), entry);
  const state = humanState(f.surface, { kind: "presentation" }); t.after(() => state.dispose());
  const panel = projectActivityPanel(f.program, f.surface, state.get(), model.snapshot(), () => false)!;
  const frame = transientFrame(panel.frame, panel.locked);
  assert.equal(frame.content.kind, "message"); assert.equal(frame.top.leading?.state, "unavailable");
  assert.equal(frame.top.trailing?.[0]?.intent.kind, "recover"); assert.equal(frame.bottom.primary, undefined);
  unavailable = false; await model.recover();
  assert.deepEqual(completed, expected); assert.equal(accepts, 0); assert.equal(f.journalEntry(), null);
});

test("disposal during acceptance hides private answers and keeps the exact journal despite a late success", async t => {
  const f = await activityClientFixture(t);
  let entered!: () => void, release!: () => void;
  const started = new Promise<void>(resolve => { entered = resolve; });
  const waiting = new Promise<void>(resolve => { release = resolve; });
  let accepts = 0;
  const transport: ControllerTransport = {
    async evidence() { throw new Error("Unused"); },
    async call(method, input) {
      const result = await dispatch(f.session, method, input);
      if (method === "accept") { accepts++; entered(); await waiting; }
      return result;
    },
  };
  const model = activityModel(f.surface, transport, () => {}, async () => {}, f.journal);
  await model.open(f.experience); model.edit("title", "Private title during lock"); await model.next();
  model.edit("body", "Private body during lock"); await model.next();
  const pending = model.accept(); await started;
  const entry = f.journalEntry(); assert.equal(entry?.pending?.intentId, model.snapshot().prepared?.id);
  assert.equal(JSON.stringify(entry).includes("Private"), false);
  model.dispose(); assert.deepEqual(model.snapshot().draft, {}); assert.equal(model.snapshot().prepared, null);
  release(); await pending;
  assert.deepEqual(f.journalEntry(), entry, "a late completion cannot clear a suspended identity's recovery");
  assert.deepEqual(model.snapshot().draft, {});
  const restored = activityModel(f.surface, transport, () => {}, async () => {}, f.journal);
  t.after(() => restored.dispose());
  await restored.open(f.experience);
  assert.equal(restored.snapshot().experience, null); assert.equal(f.journalEntry(), null); assert.equal(accepts, 1);
});

test("pending acceptance never adopts a newer preparation on the same activity", async t => {
  const f = await activityClientFixture(t), saved = await f.seed("Original approval");
  const answered = await f.session.activityAnswer(saved.activity.id, saved.activity.revision, 1, { body: "Original body" });
  const original = await f.session.activityPrepare(answered.id, answered.revision);
  const reopened = await f.session.activityReopen(original.activity.id, original.activity.revision, 1);
  const changed = await f.session.activityAnswer(reopened.id, reopened.revision, 1, { body: "Other preparation" });
  const newer = await f.session.activityPrepare(changed.id, changed.revision);
  assert.notEqual(original.intent.id, newer.intent.id);
  f.journal.save({ version: ActivityJournalVersion, journey: f.experience.id, occurrence: saved.occurrence,
    activity: saved.activity.id, pending: { kind: "accept", intentId: original.intent.id } });
  const model = f.model(); await model.open(f.experience);
  assert.equal(model.snapshot().error, "INVALID_RESPONSE"); assert.equal(model.snapshot().uncertain, true);
  assert.equal(model.snapshot().activity, null); assert.equal(model.snapshot().prepared, null);
  assert.equal(f.journalEntry()?.pending?.intentId, original.intent.id);
  assert.equal(f.calls.some(call => call.method === "accept" || call.method === "activityCreate"), false);
  assert.equal(JSON.stringify(model.snapshot()).includes("Other preparation"), false);
});

test("legacy prepared journals recover conservatively while versioned unsubmitted reviews remain editable", async t => {
  const f = await activityClientFixture(t), saved = await f.seed("Unsubmitted review");
  const answered = await f.session.activityAnswer(saved.activity.id, saved.activity.revision, 1, { body: "Not yet accepted" });
  const prepared = await f.session.activityPrepare(answered.id, answered.revision);
  const entry = { journey: f.experience.id, occurrence: saved.occurrence, activity: saved.activity.id };
  f.journal.save({ ...entry, version: ActivityJournalVersion });
  const fresh = f.model(); await fresh.open(f.experience);
  assert.equal(fresh.snapshot().uncertain, false); assert.equal(fresh.snapshot().prepared?.id, prepared.intent.id);
  fresh.dispose(); f.journal.save(entry);
  const legacy = f.model(); await legacy.open(f.experience);
  assert.equal(legacy.snapshot().uncertain, true); assert.equal(legacy.snapshot().receiptMissing, true);
  assert.equal(f.journalEntry()?.pending?.intentId, prepared.intent.id);
  await legacy.accept(); legacy.close();
  assert.equal(f.calls.some(call => call.method === "accept"), false); assert.ok(f.journalEntry());
});
