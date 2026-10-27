import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { infrastructureDigest } from "../src/storage/render-ddl.ts";
import { after, before, test } from "node:test";
import { openLocalController } from "../src/local/controller.ts";
import { postgresCluster } from "./fixtures/postgres.ts";
import { activityFixture } from "./fixtures/activity.ts";
import { dispatch } from "../src/web/dispatch.ts";

let cluster: ReturnType<typeof postgresCluster>;
before(() => { cluster = postgresCluster(); });
after(() => { cluster?.dispose(); });

const setup = () => activityFixture(cluster);

test("conditional activity drafts persist across host restart without executing commands", async () => {
  const f = await setup();
  try {
    const started = await f.session.activityCreate(randomUUID(), f.plan);
    const title = await f.session.activityAnswer(started.id, started.revision, 0, { title: "Detailed" });
    assert.equal(title.progress.nextStep, 1);
    await f.controller.close();
    const reopened = await openLocalController(f.application, f.options);
    try {
      const session = reopened.connect(f.identity.token, "human");
      assert.deepEqual(await session.activityRead(started.id), title);
      assert.equal((await f.admin.query("SELECT count(*) FROM desert_runs")).rows[0].count, "0");
      assert.equal((await f.admin.query("SELECT count(*) FROM desert_objects")).rows[0].count, "0");
    } finally { await reopened.close(); }
  } finally { await f.close(); }
});

test("prepared retries preserve the occurrence, while expired activities cannot accept", async () => {
  const f = await setup();
  try {
    const prepared = await f.prepared();
    assert.deepEqual(await dispatch(f.session, "activityPrepare", {
      id: prepared.activity.id, revision: prepared.activity.revision,
    }), prepared);
    assert.equal((await f.admin.query("SELECT count(*) FROM desert_intents")).rows[0].count, "1");
    await f.admin.query("UPDATE desert_activities SET expires_at = clock_timestamp() - interval '1 second'");
    await assert.rejects(f.session.accept(prepared.intent.id, prepared.intent.confirmationDigest), /ACTIVITY_EXPIRED/);
    await assert.rejects(f.session.activityAnswer(prepared.activity.id, prepared.activity.revision, 0, { title: "New" }), /ACTIVITY_EXPIRED/);
    assert.equal((await f.admin.query("SELECT count(*) FROM desert_objects")).rows[0].count, "0");
  } finally { await f.close(); }
});

test("activity completion and canonical effect/receipt roll back together", async () => {
  const f = await setup();
  try {
    const prepared = await f.prepared();
    await f.admin.query(`CREATE FUNCTION reject_activity_completion() RETURNS trigger LANGUAGE plpgsql AS
      $$ BEGIN IF NEW.phase = 'completed' THEN RAISE EXCEPTION 'ACTIVITY_COMPLETION_FAULT'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER reject_activity_completion BEFORE UPDATE ON desert_activities
      FOR EACH ROW EXECUTE FUNCTION reject_activity_completion()`);
    await assert.rejects(f.session.accept(prepared.intent.id, prepared.intent.confirmationDigest), /ACTIVITY_COMPLETION_FAULT/);
    assert.equal((await f.admin.query("SELECT count(*) FROM desert_objects")).rows[0].count, "0");
    assert.equal((await f.admin.query("SELECT count(*) FROM desert_receipts")).rows[0].count, "0");
    assert.equal((await f.session.activityRead(prepared.activity.id)).phase, "prepared");
    await f.admin.query("DROP TRIGGER reject_activity_completion ON desert_activities");
    await f.session.accept(prepared.intent.id, prepared.intent.confirmationDigest);
    assert.equal((await f.session.activityRead(prepared.activity.id)).phase, "completed");
  } finally { await f.close(); }
});

test("removing the installed activity mechanism cannot bypass its approval binding", async () => {
  const f = await setup();
  try {
    const prepared = await f.prepared();
    const { activities: omitted, ...plainOptions } = f.options;
    const other = await openLocalController(f.application, plainOptions);
    try {
      await assert.rejects(other.connect(f.identity.token, "human").accept(prepared.intent.id,
        prepared.intent.confirmationDigest), /ACTIVITY_CATALOG_NOT_INSTALLED/);
      assert.equal((await f.admin.query("SELECT count(*) FROM desert_objects")).rows[0].count, "0");
    } finally { await other.close(); }
  } finally { await f.close(); }
});

test("activity transport rejects delegation, unknown keys and uninstalled dynamic plans", async () => {
  const f = await setup();
  try {
    assert.throws(() => dispatch(f.session, "activityCreate", { occurrence: randomUUID(), plan: f.plan, assignee: "Bob" }), /INVALID_REQUEST/);
    assert.throws(() => dispatch(f.session, "activityCreate", { plan: f.plan }), /INVALID_REQUEST/);
    await assert.rejects(dispatch(f.session, "activityCreate", { occurrence: randomUUID(), plan: { ...f.plan, journey: "admin-write" } }), /ACTIVITY_OPERATION_NOT_INSTALLED/);
    const created = await dispatch(f.session, "activityCreate", { occurrence: randomUUID(), plan: f.plan });
    assert.deepEqual(await dispatch(f.session, "activityRead", { id: created.id }), created);
    assert.throws(() => dispatch(f.session, "activityAnswer", { id: created.id, revision: 1, step: 0, input: {}, approve: true }), /INVALID_REQUEST/);
  } finally { await f.close(); }
});

test("earlier edits invalidate branches and prior approval through every acceptance entry", async () => {
  const f = await setup();
  try {
    let state = await f.session.activityCreate(randomUUID(), f.plan);
    state = await f.session.activityAnswer(state.id, state.revision, 0, { title: "Detailed" });
    state = await f.session.activityAnswer(state.id, state.revision, 1, { body: "First body" });
    const prepared = await f.session.activityPrepare(state.id, state.revision);
    assert.equal((await f.admin.query("SELECT count(*) FROM desert_objects")).rows[0].count, "0");
    state = await f.session.activityAnswer(state.id, prepared.activity.revision, 0, { title: "Simple" });
    assert.equal(state.progress.nextStep, 2);
    assert.deepEqual(state.progress.input, { title: "Simple" });
    await assert.rejects(f.session.accept(prepared.intent.id, prepared.intent.confirmationDigest), /ACTIVITY_PREPARATION_INVALIDATED/);
    await assert.rejects(f.session.activityPrepare(state.id, state.revision), /ACTIVITY_INCOMPLETE/);
    state = await f.session.activityAnswer(state.id, state.revision, 2, { body: "New body" });
    const final = await f.session.activityPrepare(state.id, state.revision);
    const receipt = await f.session.accept(final.intent.id, final.intent.confirmationDigest);
    assert.equal(receipt.status, "completed");
    assert.deepEqual(await f.session.accept(final.intent.id, final.intent.confirmationDigest), receipt);
    assert.equal((await f.session.activityRead(state.id)).phase, "completed");
    const persisted = (await f.admin.query("SELECT facts FROM desert_objects")).rows;
    assert.equal(persisted.length, 1);
    assert.equal(persisted[0].facts.body, "New body");
  } finally { await f.close(); }
});

test("draft revision, step reachability and identity boundaries reject competing or forged answers", async () => {
  const f = await setup();
  try {
    const started = await f.session.activityCreate(randomUUID(), f.plan);
    await assert.rejects(f.session.activityAnswer(started.id, started.revision, 2, { body: "Skip ahead" }), /ACTIVITY_STEP_NOT_ACTIVE/);
    await assert.rejects(f.session.activityAnswer(started.id, started.revision, 0, { title: "A", owner: "Bob" }), /INVALID_ACTIVITY_ANSWER/);
    const results = await Promise.allSettled([
      f.session.activityAnswer(started.id, started.revision, 0, { title: "Detailed" }),
      f.session.activityAnswer(started.id, started.revision, 0, { title: "Simple" }),
    ]);
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
    assert.match(String((results.find(result => result.status === "rejected") as PromiseRejectedResult).reason), /ACTIVITY_REVISION_CONFLICT/);
    const bob = await f.controller.identities.issue("Bob");
    await assert.rejects(f.controller.connect(bob.token, "human").activityRead(started.id), /NOT_FOUND/);
    await assert.rejects(f.controller.connect(f.identity.token, "agent").activityRead(started.id), /NOT_FOUND/);
    assert.equal((await f.admin.query("SELECT count(*) FROM desert_objects")).rows[0].count, "0");
  } finally { await f.close(); }
});

test("cancellation revokes prepared acceptance while preserving recoverable draft identity", async () => {
  const f = await setup();
  try {
    let state = await f.session.activityCreate(randomUUID(), f.plan);
    state = await f.session.activityAnswer(state.id, state.revision, 0, { title: "Simple" });
    state = await f.session.activityAnswer(state.id, state.revision, 2, { body: "Do not save" });
    const prepared = await f.session.activityPrepare(state.id, state.revision);
    const cancelled = await f.session.activityCancel(state.id, prepared.activity.revision);
    assert.equal(cancelled.phase, "cancelled");
    await assert.rejects(f.session.accept(prepared.intent.id, prepared.intent.confirmationDigest), /ACTIVITY_PREPARATION_INVALIDATED/);
    await assert.rejects(f.session.activityAnswer(state.id, cancelled.revision, 0, { title: "Restart" }), /ACTIVITY_CLOSED/);
    assert.equal((await f.admin.query("SELECT count(*) FROM desert_objects")).rows[0].count, "0");
  } finally { await f.close(); }
});

test("activity acceptance semantics require the new installation revision without silently repinning old stores", async () => {
  const f = await setup();
  try {
    const earlier = "0".repeat(64);
    assert.equal((await f.admin.query("SELECT infrastructure_digest FROM desert_installation")).rows[0].infrastructure_digest, infrastructureDigest());
    await f.controller.close();
    await f.admin.query("UPDATE desert_installation SET infrastructure_digest = $1", [earlier]);
    await assert.rejects(openLocalController(f.application, f.options), /INSTALLATION_MISMATCH/);
    assert.equal((await f.admin.query("SELECT infrastructure_digest FROM desert_installation")).rows[0].infrastructure_digest, earlier);
  } finally { await f.close(); }
});
