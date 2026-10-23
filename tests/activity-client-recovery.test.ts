import test from "node:test";
import assert from "node:assert/strict";
import { activityClientFixture } from "./fixtures/activity-client.ts";
import { activityModel } from "../src/web/client/activity-model.ts";
import { viewProgramModel } from "../src/web/client/view-program.ts";
import { TransportError, type ControllerTransport } from "../src/web/client/transport.ts";
import { compile } from "../src/compile.ts";
import { dispatch } from "../src/web/dispatch.ts";
import { ActivityNotebook } from "./fixtures/activity-experience.ts";
import { captureViewEvents } from "./fixtures/owned-view-events.ts";
import { until } from "./fixtures/multi-view-runtime.ts";
import { transientFrame } from "../src/interaction/transient-frame.ts";

test("an exact journal rejects a valid same-plan reply belonging to a different activity", async t => {
  const f = await activityClientFixture(t);
  const selected = await f.seed("Selected private title");
  const other = await f.seed("Unselected private title");
  f.journal.save({ journey: f.experience.id, occurrence: selected.occurrence, activity: selected.activity.id });
  const transport: ControllerTransport = {
    async evidence() { throw new Error("Unused"); },
    async call(method, input) {
      if (method === "activityRead") return await f.session.activityRead(other.activity.id) as never;
      return dispatch(f.session, method, input);
    },
  };
  const model = activityModel(f.surface, transport, () => {}, async () => {}, f.journal);
  t.after(() => model.dispose());
  await model.open(f.experience);
  assert.equal(model.snapshot().error, "INVALID_RESPONSE");
  assert.equal(model.snapshot().activity, null);
  assert.equal(f.journalEntry()?.activity, selected.activity.id, "a substituted response cannot retarget recovery");
});

test("the previous review owner cannot replay acceptance after its reply becomes uncertain", async t => {
  const f = await activityClientFixture(t), application = compile(ActivityNotebook);
  const availability = f.session.watchAvailability(); t.after(() => availability.dispose());
  let acceptCalls = 0;
  const transport: ControllerTransport = {
    async evidence() { return availability.evidence(); },
    async call(method, input) {
      const result = await dispatch(f.session, method, input);
      if (method === "accept" && ++acceptCalls === 1) throw new TransportError("CONNECTION_LOST");
      return result;
    },
  };
  const validate = Object.assign((id: string, value: unknown) => application.validateInput(id, value).valid,
    { inspect: (id: string, value: unknown) => application.validateInput(id, value) });
  const model = viewProgramModel(f.program, f.surface, validate, transport, undefined, undefined, f.journal);
  t.after(() => model.stop());
  const emit = () => captureViewEvents(model);
  await model.start();
  await until(() => model.snapshot().state.availability.journeys[f.experience.id]?.dependenciesReady === true);
  model.navigate("notes");
  emit()({ kind: "surface.invoke", intent: { kind: "view.output", view: "notes", output: "create" } });
  await until(() => Boolean(model.snapshot().activity.activity) && !model.snapshot().activity.busy);
  emit()({ kind: "input.change", name: "title", value: "Explicit acceptance" });
  emit()({ kind: "surface.invoke", intent: { kind: "journey", journey: f.experience.id } });
  await until(() => model.snapshot().activity.activity?.progress.nextStep === 1 && !model.snapshot().activity.busy);
  emit()({ kind: "input.change", name: "body", value: "One accepted operation" });
  emit()({ kind: "surface.invoke", intent: { kind: "journey", journey: f.experience.id } });
  await until(() => Boolean(model.snapshot().activity.prepared) && !model.snapshot().activity.busy);
  const oldReview = emit();
  oldReview({ kind: "surface.invoke", intent: { kind: "accept" } });
  await until(() => model.snapshot().activity.uncertain && !model.snapshot().activity.busy);
  oldReview({ kind: "surface.invoke", intent: { kind: "accept" } });
  await until(() => !model.snapshot().activity.busy);
  assert.equal(acceptCalls, 1, "only explicit receipt recovery is allowed after uncertainty");
  assert.equal(model.snapshot().activity.uncertain, true);
  const panel = model.snapshot().panel!;
  const frame = transientFrame(panel.frame, panel.locked);
  assert.equal(frame.top.trailing?.[0]?.intent.kind, "recover");
  assert.equal(frame.bottom.primary, undefined, "receipt-only recovery cannot expose retry acceptance");
  assert.equal(frame.top.leading?.state, "unavailable");
  emit()({ kind: "surface.invoke", intent: { kind: "recover" } });
  await until(() => model.snapshot().activity.experience === null);
  assert.equal(acceptCalls, 1);
  assert.equal(f.journalEntry(), null);
});

test("cancellation and acceptance serialize on the same activity; only one can win", async t => {
  const f = await activityClientFixture(t), seeded = await f.seed("Cancellation race");
  const answered = await f.session.activityAnswer(seeded.activity.id, seeded.activity.revision, 1, { body: "Race witness" });
  const prepared = await f.session.activityPrepare(answered.id, answered.revision);
  const [cancel, accept] = await Promise.allSettled([
    f.session.activityCancel(prepared.activity.id, prepared.activity.revision),
    f.session.accept(prepared.intent.id, prepared.intent.confirmationDigest),
  ]);
  assert.equal([cancel, accept].filter(result => result.status === "fulfilled").length, 1);
  const latest = await f.session.activityRead(answered.id);
  const notes = await f.session.read((await f.session.begin("read-note")).id);
  if (cancel.status === "fulfilled") {
    assert.equal(latest.phase, "cancelled"); assert.equal(notes.length, 0);
    assert.equal(accept.status, "rejected");
    assert.match(String((accept as PromiseRejectedResult).reason), /ACTIVITY_PREPARATION_INVALIDATED/);
  } else {
    assert.equal(latest.phase, "completed"); assert.equal(notes.length, 1);
    assert.match(String(cancel.reason), /ACTIVITY_CLOSED/);
    assert.deepEqual(await f.session.receipt(prepared.intent.id), (accept as PromiseFulfilledResult<unknown>).value);
  }
});

test("a failed receipt lookup on reload retains exact recovery rather than reopening acceptance", async t => {
  const f = await activityClientFixture(t), seeded = await f.seed("Already accepted");
  const answered = await f.session.activityAnswer(seeded.activity.id, seeded.activity.revision, 1, { body: "Awaiting receipt" });
  const prepared = await f.session.activityPrepare(answered.id, answered.revision);
  await f.session.accept(prepared.intent.id, prepared.intent.confirmationDigest);
  f.journal.save({ journey: f.experience.id, occurrence: seeded.occurrence, activity: seeded.activity.id });
  const transport: ControllerTransport = {
    async evidence() { throw new Error("Unused"); },
    async call(method, input) {
      if (method === "receipt") throw new TransportError("CONNECTION_LOST");
      return dispatch(f.session, method, input);
    },
  };
  const model = activityModel(f.surface, transport, () => {}, async () => {}, f.journal);
  t.after(() => model.dispose());
  await model.open(f.experience);
  assert.equal(model.snapshot().activity?.phase, "completed");
  assert.equal(model.snapshot().uncertain, true, "completed activity awaiting receipt must remain recovery-only");
  model.close();
  assert.equal(f.journalEntry()?.activity, seeded.activity.id, "receipt uncertainty cannot discard its exact journal");
});

test("reload does not forget acceptance uncertainty when the server is still prepared", async t => {
  const f = await activityClientFixture(t);
  let disconnected = true;
  const transport: ControllerTransport = {
    async evidence() { throw new Error("Unused"); },
    async call(method, input) {
      if (method === "accept" && disconnected) {
        disconnected = false;
        throw new TransportError("CONNECTION_LOST");
      }
      return dispatch(f.session, method, input);
    },
  };
  const first = activityModel(f.surface, transport, () => {}, async () => {}, f.journal);
  await first.open(f.experience); first.edit("title", "No acceptance result"); await first.next();
  first.edit("body", "Do not replay"); await first.next();
  await first.accept();
  assert.equal(first.snapshot().uncertain, true);
  first.dispose();
  const resumed = activityModel(f.surface, transport, () => {}, async () => {}, f.journal);
  t.after(() => resumed.dispose());
  await resumed.open(f.experience);
  assert.equal(resumed.snapshot().activity?.phase, "prepared");
  assert.equal(resumed.snapshot().uncertain, true, "a reload cannot turn an unconfirmed operation into a fresh approval");
  const journal = f.journalEntry();
  assert.ok(journal?.pending?.intentId);
  await resumed.accept();
  assert.deepEqual(f.journalEntry(), journal, "direct model calls cannot bypass receipt-only recovery");
  assert.equal((await f.session.activityRead(resumed.snapshot().activity!.id)).phase, "prepared");
});
