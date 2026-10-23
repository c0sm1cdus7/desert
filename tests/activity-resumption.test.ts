import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { activityFixture } from "./fixtures/activity.ts";
import { postgresCluster } from "./fixtures/postgres.ts";
import { openLocalController } from "../src/local/controller.ts";

let cluster: ReturnType<typeof postgresCluster>;
before(() => { cluster = postgresCluster(); });
after(() => cluster?.dispose());

test("lost creation responses retry the same occurrence without resetting saved answers", async () => {
  const f = await activityFixture(cluster);
  try {
    const occurrence = randomUUID();
    const created = await f.session.activityCreate(occurrence, f.plan);
    const answered = await f.session.activityAnswer(created.id, created.revision, 0, { title: "Detailed" });
    assert.deepEqual(await f.session.activityCreate(occurrence, f.plan), answered);
    await f.controller.close();
    const restarted = await openLocalController(f.application, f.options);
    try {
      const session = restarted.connect(f.identity.token, "human");
      assert.deepEqual(await session.activityCreate(occurrence, f.plan), answered);
      const page = await session.activityList();
      assert.deepEqual(page.items.map(item => item.id), [created.id]);
      assert.equal(JSON.stringify(page).includes("Detailed"), false, "discovery does not disclose draft answers");
      assert.deepEqual(await session.activityRead(page.items[0]!.id), answered);
    } finally { await restarted.close(); }
    assert.equal((await f.admin.query("SELECT count(*) FROM desert_activities")).rows[0].count, "1");
    assert.equal((await f.admin.query("SELECT count(*) FROM desert_runs")).rows[0].count, "0");
  } finally { await f.close(); }
});

test("concurrent duplicate creation converges; changed material cannot reuse an occurrence", async () => {
  const f = await activityFixture(cluster);
  try {
    const occurrence = randomUUID();
    const [first, second] = await Promise.all([
      f.session.activityCreate(occurrence, f.plan), f.session.activityCreate(occurrence, f.plan),
    ]);
    assert.deepEqual(first, second);
    const differentPlan = { ...f.plan, steps: [{ ...f.plan.steps[0]!, inputs: ["title", "body"] }] };
    await assert.rejects(f.session.activityCreate(occurrence, differentPlan), /ACTIVITY_OCCURRENCE_CONFLICT/);
    const newOccurrence = await f.session.activityCreate(randomUUID(), f.plan);
    assert.notEqual(first.id, newOccurrence.id);
    assert.equal((await f.admin.query("SELECT count(*) FROM desert_activities")).rows[0].count, "2");
  } finally { await f.close(); }
});

test("Back reopens one active step, revokes preparation immediately and restores only its own answer", async () => {
  const f = await activityFixture(cluster);
  try {
    const prepared = await f.prepared();
    const reopened = await f.session.activityReopen(prepared.activity.id, prepared.activity.revision, 0);
    assert.equal(reopened.revision, prepared.activity.revision + 1);
    assert.equal(reopened.phase, "draft");
    assert.equal(reopened.progress.nextStep, 0);
    assert.deepEqual(reopened.progress.completedSteps, []);
    assert.deepEqual(reopened.progress.input, {});
    assert.deepEqual(reopened.currentInput, { title: "Simple" });
    assert.equal(JSON.stringify(reopened).includes("Pending"), false);
    await assert.rejects(f.session.accept(prepared.intent.id, prepared.intent.confirmationDigest), /ACTIVITY_PREPARATION_INVALIDATED/);
    await assert.rejects(f.session.activityPrepare(reopened.id, reopened.revision), /ACTIVITY_INCOMPLETE/);
    const changed = await f.session.activityAnswer(reopened.id, reopened.revision, 0, { title: "Detailed" });
    assert.equal(changed.progress.nextStep, 1);
    assert.deepEqual(changed.currentInput, {}, "the inactive alternative's answer cannot fill another branch");
    await assert.rejects(f.session.activityReopen(changed.id, changed.revision, 2), /ACTIVITY_STEP_NOT_ACTIVE/);
    assert.equal((await f.admin.query("SELECT count(*) FROM desert_objects")).rows[0].count, "0");
  } finally { await f.close(); }
});

test("activity discovery, occurrence retries and reopen retain identity, surface and revision isolation", async () => {
  const f = await activityFixture(cluster);
  try {
    const occurrence = randomUUID();
    let state = await f.session.activityCreate(occurrence, f.plan);
    state = await f.session.activityAnswer(state.id, state.revision, 0, { title: "Alice private" });
    const bob = f.controller.connect((await f.controller.identities.issue("Bob")).token, "human");
    const agent = f.controller.connect(f.identity.token, "agent");
    assert.deepEqual((await bob.activityList()).items, []);
    assert.deepEqual((await agent.activityList()).items, []);
    await assert.rejects(bob.activityList({ after: state.id }), /NOT_FOUND/);
    await assert.rejects(bob.activityReopen(state.id, state.revision, 0), /NOT_FOUND/);
    await assert.rejects(agent.activityReopen(state.id, state.revision, 0), /NOT_FOUND/);
    const other = await bob.activityCreate(occurrence, f.plan);
    assert.notEqual(other.id, state.id, "occurrences are scoped to the authenticated principal and surface");
    await f.controller.identities.revoke((await f.admin.query("SELECT actor FROM desert_activities WHERE id = $1", [other.id])).rows[0].actor);
    await assert.rejects(bob.activityCreate(occurrence, f.plan), /UNAUTHENTICATED/);
    const results = await Promise.allSettled([
      f.session.activityReopen(state.id, state.revision, 0), f.session.activityReopen(state.id, state.revision, 0),
    ]);
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
    assert.match(String((results.find(result => result.status === "rejected") as PromiseRejectedResult).reason), /ACTIVITY_REVISION_CONFLICT/);
    assert.equal((await f.admin.query("SELECT count(*) FROM desert_objects")).rows[0].count, "0");
  } finally { await f.close(); }
});

test("activity discovery is bounded and closed or expired drafts cannot be reopened", async () => {
  const f = await activityFixture(cluster);
  try {
    const states = [];
    for (let index = 0; index < 3; index++) states.push(await f.session.activityCreate(randomUUID(), f.plan));
    const first = await f.session.activityList({ limit: 2 });
    assert.ok(first.nextCursor);
    const second = await f.session.activityList({ limit: 2, after: first.nextCursor });
    assert.equal(first.items.length, 2);
    assert.equal(second.items.length, 1);
    assert.equal(new Set([...first.items, ...second.items].map(item => item.id)).size, 3);
    assert.equal(second.nextCursor, undefined);
    const cancelled = await f.session.activityCancel(states[0]!.id, states[0]!.revision);
    await assert.rejects(f.session.activityReopen(cancelled.id, cancelled.revision, 0), /ACTIVITY_CLOSED/);
    await f.admin.query("UPDATE desert_activities SET expires_at = clock_timestamp() - interval '1 second' WHERE id = $1", [states[1]!.id]);
    await assert.rejects(f.session.activityReopen(states[1]!.id, states[1]!.revision, 0), /ACTIVITY_EXPIRED/);
    assert.deepEqual((await f.session.activityList()).items.map(item => item.id), [states[2]!.id]);
    await assert.rejects(f.session.activityList({ limit: 101 }), /INVALID_ACTIVITY_LIST/);
  } finally { await f.close(); }
});
