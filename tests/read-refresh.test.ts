import assert from "node:assert/strict";
import test from "node:test";
import { readRefresh } from "../src/web/client/read-refresh.ts";

test("read refresh is single-flight, coalesces explicit requests and never queues observed polls", async () => {
  let time = 0, active = 0, maximum = 0, calls = 0;
  const releases: (() => void)[] = [];
  const refresh = readRefresh(async () => {
    calls++; maximum = Math.max(maximum, ++active);
    await new Promise<void>(resolve => releases.push(resolve)); active--;
  }, () => true, () => time);
  const first = refresh.request(); await Promise.resolve();
  time = 10000;
  for (let index = 0; index < 20; index++) refresh.observe();
  assert.equal(calls, 1);
  const second = refresh.request(), third = refresh.request();
  assert.equal(second, first); assert.equal(third, first);
  releases.shift()!(); await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(calls, 2); assert.equal(maximum, 1);
  releases.shift()!(); await first;
  refresh.observe(); await Promise.resolve(); assert.equal(calls, 2);
  time += 999; refresh.observe(); await Promise.resolve(); assert.equal(calls, 2);
  time += 1; refresh.observe(); await Promise.resolve(); assert.equal(calls, 3);
  refresh.stop(); releases.shift()!();
});

test("ineligible or disposed reads cannot be started or revived by an outstanding refresh", async () => {
  let eligible = false, calls = 0, release!: () => void;
  const refresh = readRefresh(async () => { calls++; await new Promise<void>(resolve => { release = resolve; }); }, () => eligible);
  await refresh.request(); refresh.observe(); assert.equal(calls, 0);
  eligible = true;
  const pending = refresh.request(); await Promise.resolve();
  refresh.request(); refresh.stop(); release(); await pending;
  await refresh.request(); refresh.observe(); assert.equal(calls, 1);
});

test("an explicit request at completion starts a fresh pass instead of stranding its queue", async () => {
  let calls = 0, next: Promise<void> | undefined;
  const refresh = readRefresh(async () => {
    calls++;
    if (calls === 1) queueMicrotask(() => queueMicrotask(() => { next = refresh.request(); }));
  }, () => true);
  await refresh.request(); await next;
  assert.equal(calls, 2);
  refresh.stop();
});

test("a new read generation proceeds without waiting for an obsolete host response", async () => {
  let calls = 0, firstSignal: AbortSignal | undefined, release!: () => void;
  const refresh = readRefresh(async (signal: AbortSignal) => {
    calls++;
    if (calls === 1) { firstSignal = signal; await new Promise<void>(resolve => { release = resolve; }); }
  }, () => true);
  const old = refresh.request(); await Promise.resolve();
  refresh.invalidate();
  await refresh.request(); await old;
  assert.equal(calls, 2); assert.equal(firstSignal?.aborted, true);
  release(); await Promise.resolve();
  await refresh.request(); assert.equal(calls, 3, "late completion cannot clear the active generation");
  refresh.stop();
});
