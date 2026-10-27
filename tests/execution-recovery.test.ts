import test from "node:test";
import assert from "node:assert/strict";
import { setTimeout } from "node:timers/promises";
import { runNextExecution } from "../src/execution.ts";
import { executionFixture } from "./fixtures/execution-host.ts";
import { renderWriteFault, renderWriteFaultRemoval } from "../src/storage/render-faults.ts";
import { jobsTable } from "../src/storage/tables/execution.ts";

test("crashed workers retain an uncertain permit after their lease expires", async () => {
  const f = await executionFixture();
  try {
    const orphan = await f.queue.enqueue(f.actor, { key: "orphan", input: { message: "unknown", mode: "echo" } });
    await f.pool.query(`UPDATE desert_execution.jobs SET state='running', lease_until=clock_timestamp()-interval '1 second',
      claim_token='00000000-0000-4000-8000-000000000001' WHERE id=$1`, [orphan.id]);
    const next = await f.queue.enqueue(f.actor, { key: "next", input: { message: "queued", mode: "echo" } });
    assert.equal(await runNextExecution(f.queue, f.actor), undefined);
    assert.equal((await f.queue.inspect(orphan)).state, "uncertain");
    assert.equal((await f.queue.inspect(orphan)).reason, "worker-lease-expired");
    assert.equal((await f.queue.inspect(next)).state, "queued");
    assert.equal(await runNextExecution(f.queue, f.actor), undefined);
  } finally { await f.close(); }
});

test("enqueue faults commit no acknowledgement and database restart preserves queued identities", async () => {
  const f = await executionFixture();
  try {
    const fault = { name: "fail_insert", event: "INSERT", message: "TEST_ENQUEUE_FAULT" } as const;
    await f.pool.query(renderWriteFault(jobsTable, fault));
    await assert.rejects(f.queue.enqueue(f.actor, { key: "fault", input: { message: "x", mode: "echo" } }), /TEST_ENQUEUE_FAULT/);
    assert.equal(await f.queue.lookup(f.actor, "fault"), undefined);
    await f.pool.query(renderWriteFaultRemoval(jobsTable, fault));
    const job = await f.queue.enqueue(f.actor, { key: "survive", input: { message: "durable", mode: "echo" } });
    f.cluster.stop(); f.cluster.start();
    const reopened = await f.reopen();
    const environment = await reopened.registerEnvironment({ name: "fixture-local", label: "Fixture machine" });
    const actor = await reopened.registerActor(environment, { name: "fixture", label: "Fixture actor", concurrency: 1, adapter: f.adapter });
    const recovered = (await reopened.lookup(actor, "survive"))!;
    assert.equal(recovered.id, job.id);
    assert.equal((await reopened.inspect(recovered)).state, "queued");
    await runNextExecution(reopened, actor);
    assert.equal((await reopened.inspect(recovered)).state, "succeeded");
  } finally { await f.close(); }
});

test("cancellation after process start reports uncertainty and output stays bounded", async () => {
  const f = await executionFixture();
  try {
    const job = await f.queue.enqueue(f.actor, { key: "cancel-running", input: { message: "wait", mode: "wait" } });
    const worker = runNextExecution(f.queue, f.actor);
    for (let attempt = 0; attempt < 50 && (await f.queue.inspect(job)).state !== "running"; attempt++) await setTimeout(10);
    assert.equal((await f.queue.inspect(job)).state, "running");
    await f.queue.cancel(job);
    await worker;
    assert.equal((await f.queue.inspect(job)).state, "uncertain");
    assert.equal((await f.queue.inspect(job)).reason, "cancelled-after-start");
    const environment = await f.queue.registerEnvironment({ name: "second", label: "Second" });
    const actor = await f.queue.registerActor(environment, { name: "fixture", label: "Fixture", concurrency: 1, adapter: f.adapter });
    const overflow = await f.queue.enqueue(actor, { key: "overflow", input: { message: "large", mode: "overflow" } });
    await runNextExecution(f.queue, actor);
    const result = await f.queue.inspect(overflow);
    assert.equal(result.state, "uncertain");
    assert.equal(result.reason, "output-limit");
    assert.ok(Buffer.byteLength(result.result!.stdout) + Buffer.byteLength(result.result!.stderr) <= 1024);
  } finally { await f.close(); }
});
