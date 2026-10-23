import test from "node:test";
import assert from "node:assert/strict";
import { Type } from "@sinclair/typebox";
import { fixedProcessAdapter, openExecutionQueue, runNextExecution } from "../src/execution.ts";
import { claimNext, finishClaim, startClaim } from "../src/execution/claims.ts";
import { queueContext } from "../src/execution/context.ts";
import { executionFixture } from "./fixtures/execution-host.ts";

test("fixed process adapters reject dynamic shell properties and relative host paths", () => {
  const definition = { name: "fixture", executable: process.execPath, arguments: [], workingDirectory: "/tmp",
    input: Type.Object({ message: Type.String() }, { additionalProperties: false }), timeoutMs: 1000, maxOutputBytes: 1024 };
  assert.throws(() => fixedProcessAdapter({ ...definition, executable: "node" }), /EXECUTION_ABSOLUTE_PATH_REQUIRED/);
  assert.throws(() => fixedProcessAdapter({ ...definition, workingDirectory: "." }), /EXECUTION_ABSOLUTE_PATH_REQUIRED/);
  assert.throws(() => Reflect.apply(fixedProcessAdapter, undefined, [{ ...definition, shell: true }]), /EXECUTION_PROPERTIES_INVALID/);
  assert.throws(() => fixedProcessAdapter({ ...definition, timeoutMs: Infinity }), /EXECUTION_LIMIT_INVALID/);
  assert.throws(() => fixedProcessAdapter({ ...definition, arguments: ["bad\0argument"] }), /EXECUTION_ARGUMENTS_INVALID/);
});

test("unknown schema revisions and substituted bindings fail before any process can run", async () => {
  const f = await executionFixture();
  try {
    await assert.rejects(f.queue.registerActor(f.environment, { name: "zero", label: "Zero", concurrency: 0, adapter: f.adapter }),
      /EXECUTION_LIMIT_INVALID/);
    await assert.rejects(f.queue.registerActor(f.environment, { name: "clone", label: "Clone", concurrency: 1, adapter: { ...f.adapter } }),
      /EXECUTION_ADAPTER_REQUIRED/);
    const job = await f.queue.enqueue(f.actor, { key: "original", input: { message: "known", mode: "echo" } });
    await assert.rejects(f.queue.inspect({ ...job }), /EXECUTION_REFERENCE_REQUIRED/);
    await assert.rejects(f.queue.enqueue(f.actor, { key: "extra", input: { message: "known", mode: "echo", command: "anything" } as never }),
      /EXECUTION_INPUT_INVALID/);
    await f.pool.query("UPDATE desert_execution.installation SET version=999");
    await assert.rejects(runNextExecution(f.queue, f.actor), /EXECUTION_INSTALLATION_MISMATCH/);
    await assert.rejects(openExecutionQueue(f.connection), /EXECUTION_INSTALLATION_MISMATCH/);
    await f.pool.query("UPDATE desert_execution.installation SET version=1");
    assert.equal((await f.queue.inspect(job)).state, "queued");
    assert.equal((await f.pool.query("SELECT to_regclass('public.desert_objects') AS product")).rows[0].product, null,
      "The host-only queue must not install or bypass a product controller");
  } finally { await f.close(); }
});

test("a confirmed spawn failure is durable and does not imply that an adapter is connected", async () => {
  const f = await executionFixture();
  try {
    const adapter = fixedProcessAdapter({ name: "missing", executable: "/definitely-not-installed/desert-fixture-only",
      arguments: [], workingDirectory: "/tmp", input: Type.Object({}, { additionalProperties: false }),
      timeoutMs: 1000, maxOutputBytes: 1024 });
    const actor = await f.queue.registerActor(f.environment, { name: "missing", label: "Not installed", concurrency: 1, adapter });
    const job = await f.queue.enqueue(actor, { key: "not-installed", input: {} });
    await runNextExecution(f.queue, actor);
    const result = await f.queue.inspect(job);
    assert.equal(result.state, "failed");
    assert.equal(result.reason, "process-not-started");
    assert.equal(await runNextExecution(f.queue, actor), undefined);
  } finally { await f.close(); }
});

test("a stale worker cannot overwrite an uncertain outcome and a changed payload is not executed", async () => {
  const f = await executionFixture();
  try {
    const job = await f.queue.enqueue(f.actor, { key: "claimed", input: { message: "unknown", mode: "echo" } });
    const context = queueContext(f.queue);
    const claim = (await claimNext(context, f.actor))!;
    assert.equal(await startClaim(context, claim), true);
    await f.pool.query("UPDATE desert_execution.jobs SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1", [job.id]);
    assert.equal(await claimNext(context, f.actor), undefined);
    assert.equal(await finishClaim(context, claim, { state: "succeeded", reason: null,
      result: { exitCode: 0, signal: null, stdout: "stale", stderr: "" } }), false);
    assert.equal((await f.queue.inspect(job)).state, "uncertain");
    assert.equal((await f.queue.inspect(job)).result, null);
    const other = await f.queue.registerActor(f.environment, { name: "other", label: "Other", concurrency: 1, adapter: f.adapter });
    const changed = await f.queue.enqueue(other, { key: "changed", input: { message: "original", mode: "echo" } });
    await f.pool.query("UPDATE desert_execution.jobs SET input=$2 WHERE id=$1", [changed.id, JSON.stringify({ message: "changed", mode: "echo" })]);
    await assert.rejects(runNextExecution(f.queue, other), /EXECUTION_STORED_INPUT_MISMATCH/);
    assert.equal((await f.queue.inspect(changed)).state, "queued");
  } finally { await f.close(); }
});
