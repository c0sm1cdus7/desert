import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { privateImageWork } from "../src/assets/work.ts";

test("image work acquires a bounded slot before reading any bytes and releases only after settlement", async () => {
  const store = randomUUID(), begun: number[] = [];
  const release: (() => void)[] = [];
  const run = (number: number, signal?: AbortSignal) => privateImageWork(store, async () => {
    begun.push(number);
    await new Promise<void>(resolve => { release.push(resolve); });
    return number;
  }, signal);
  const first = run(1), abort = new AbortController(), second = run(2, abort.signal), third = run(3);
  assert.deepEqual(begun, [1]);
  await assert.rejects(run(4), /ASSET_PROCESSOR_BUSY/);
  abort.abort(); await assert.rejects(second, /ASSET_PROCESSING_CANCELLED/);
  assert.deepEqual(begun, [1]);
  release.shift()!(); assert.equal(await first, 1);
  await new Promise(resolve => setImmediate(resolve)); assert.deepEqual(begun, [1, 3]);
  release.shift()!(); assert.equal(await third, 3);
});
test("cancelled work never enters its byte-reading operation", async () => {
  const signal = AbortSignal.abort(); let called = false;
  await assert.rejects(privateImageWork(randomUUID(), async () => { called = true; }, signal), /ASSET_PROCESSING_CANCELLED/);
  assert.equal(called, false);
});
