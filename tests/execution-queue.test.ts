import test from "node:test";
import assert from "node:assert/strict";
import { runNextExecution } from "../src/execution.ts";
import { executionFixture } from "./fixtures/execution-host.ts";

test("execution queue persists environment-bound actors and deduplicates exact submissions", async () => {
  const f = await executionFixture();
  try {
    const first = await f.queue.enqueue(f.actor, { key: "operation-1", input: { message: "hello", mode: "echo" } });
    const repeated = await f.queue.enqueue(f.actor, { key: "operation-1", input: { mode: "echo", message: "hello" } });
    assert.equal(first.id, repeated.id);
    await assert.rejects(f.queue.enqueue(f.actor, { key: "operation-1", input: { message: "changed", mode: "echo" } }),
      /EXECUTION_SUBMISSION_CONFLICT/);
    await assert.rejects(f.queue.enqueue(f.actor, { key: "invalid", input: { message: "x", mode: "unknown" } as never }),
      /EXECUTION_INPUT_INVALID/);
    await assert.rejects(f.queue.enqueue({ ...f.actor }, { key: "forged", input: { message: "x", mode: "echo" } }),
      /EXECUTION_REFERENCE_REQUIRED/);
    const other = await f.queue.registerEnvironment({ name: "other", label: "Other machine" });
    const otherActor = await f.queue.registerActor(other, { name: "fixture", label: "Fixture actor", concurrency: 1, adapter: f.adapter });
    assert.notEqual(otherActor.id, f.actor.id);
    assert.notEqual((await f.queue.enqueue(otherActor, { key: "operation-1", input: { message: "hello", mode: "echo" } })).id, first.id);
    const reopened = await f.reopen();
    const environment = await reopened.registerEnvironment({ name: "fixture-local", label: "Fixture machine" });
    const actor = await reopened.registerActor(environment, { name: "fixture", label: "Fixture actor", concurrency: 1, adapter: f.adapter });
    assert.equal((await reopened.lookup(actor, "operation-1"))?.id, first.id);
    assert.equal((await reopened.inspect((await reopened.lookup(actor, "operation-1"))!)).state, "queued");
    await assert.rejects(reopened.registerActor(environment, { name: "fixture", label: "Fixture actor", concurrency: 2, adapter: f.adapter }),
      /EXECUTION_ACTOR_BINDING_CONFLICT/);
  } finally { await f.close(); }
});

test("two workers share the durable actor concurrency permit and fixed process input stays data", async () => {
  const f = await executionFixture();
  const previousSecret = process.env.EXECUTION_TEST_SECRET;
  process.env.EXECUTION_TEST_SECRET = "fixture-only-must-not-reach-child";
  try {
    const malicious = "$(touch /tmp/should-not-execute); echo NO";
    const job = await f.queue.enqueue(f.actor, { key: "echo", input: { message: malicious, mode: "echo" } });
    const results = await Promise.all([runNextExecution(f.queue, f.actor), runNextExecution(f.queue, f.actor)]);
    assert.equal(results.filter(Boolean).length, 1);
    const done = await f.queue.inspect(job);
    assert.equal(done.state, "succeeded");
    const output = JSON.parse(done.result!.stdout);
    assert.equal(output.input.message, malicious);
    assert.equal(output.operationId, job.id);
    assert.equal(output.inheritedSecret, false);
    assert.equal(await runNextExecution(f.queue, f.actor), undefined);
    assert.equal((await f.pool.query("SELECT count(*)::int AS count FROM desert_execution.jobs")).rows[0].count, 1);
  } finally {
    if (previousSecret === undefined) delete process.env.EXECUTION_TEST_SECRET;
    else process.env.EXECUTION_TEST_SECRET = previousSecret;
    await f.close();
  }
});

test("queued cancellation prevents execution; started interruption and lost leases stay uncertain without replay", async () => {
  const f = await executionFixture();
  try {
    const cancelled = await f.queue.enqueue(f.actor, { key: "cancel", input: { message: "never", mode: "echo" } });
    await f.queue.cancel(cancelled);
    assert.equal((await f.queue.inspect(cancelled)).state, "cancelled");
    assert.equal(await runNextExecution(f.queue, f.actor), undefined);
    const timedOut = await f.queue.enqueue(f.actor, { key: "timeout", input: { message: "slow", mode: "wait" } });
    await runNextExecution(f.queue, f.actor);
    assert.equal((await f.queue.inspect(timedOut)).state, "uncertain");
    const next = await f.queue.enqueue(f.actor, { key: "next", input: { message: "later", mode: "echo" } });
    assert.equal(await runNextExecution(f.queue, f.actor), undefined, "uncertainty retains the permit until trusted reconciliation exists");
    assert.equal((await f.queue.inspect(next)).state, "queued");
  } finally { await f.close(); }
});

test("nonzero process exit records observed failure and never retries automatically", async () => {
  const f = await executionFixture();
  try {
    const failed = await f.queue.enqueue(f.actor, { key: "failure", input: { message: "no", mode: "fail" } });
    await runNextExecution(f.queue, f.actor);
    assert.equal((await f.queue.inspect(failed)).state, "failed");
    assert.equal((await f.queue.inspect(failed)).result?.exitCode, 7);
    assert.equal(await runNextExecution(f.queue, f.actor), undefined);
  } finally { await f.close(); }
});

test("separate jobs cannot exceed the durable per-actor limit under concurrent workers", async () => {
  const f = await executionFixture();
  try {
    const first = await f.queue.enqueue(f.actor, { key: "first", input: { message: "slow", mode: "wait" } });
    const second = await f.queue.enqueue(f.actor, { key: "second", input: { message: "later", mode: "echo" } });
    const outcomes = await Promise.all([runNextExecution(f.queue, f.actor), runNextExecution(f.queue, f.actor), runNextExecution(f.queue, f.actor)]);
    assert.equal(outcomes.filter(Boolean).length, 1);
    assert.equal((await f.queue.inspect(first)).state, "uncertain");
    assert.equal((await f.queue.inspect(second)).state, "queued");
  } finally { await f.close(); }
});
