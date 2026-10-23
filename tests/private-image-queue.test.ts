import assert from 'node:assert/strict';
import test from 'node:test';
import { privateImageQueue } from '../src/web/client/private-image-queue.ts';

test('private image reads stay below the host limit and drain without retaining results', async () => {
  const schedule = privateImageQueue(), releases: (() => void)[] = [];
  let active = 0, highest = 0;
  const jobs = Array.from({ length: 12 }, (_, index) => schedule(new AbortController().signal, async () => {
    highest = Math.max(highest, ++active);
    await new Promise<void>(resolve => releases.push(resolve)); active--; return index;
  }));
  for (let completed = 0; completed < 12;) {
    await new Promise(resolve => setImmediate(resolve));
    const batch = releases.splice(0); completed += batch.length; batch.forEach(resolve => resolve());
  }
  assert.deepEqual(await Promise.all(jobs), Array.from({ length: 12 }, (_, index) => index));
  assert.equal(highest, 2);
});

test('queued cancellation and deadlines never execute a stale read', async () => {
  const schedule = privateImageQueue(1), first = new AbortController();
  let release!: () => void, executed = false;
  const running = schedule(first.signal, () => new Promise<void>(resolve => { release = resolve; }));
  await Promise.resolve();
  const abort = new AbortController();
  const queued = schedule(abort.signal, async () => { executed = true; });
  abort.abort(new Error('scope closed'));
  await assert.rejects(queued, /scope closed/);
  const timed = schedule(AbortSignal.timeout(10), async () => { executed = true; });
  await Promise.all([assert.rejects(timed, { name: 'TimeoutError' }), new Promise(resolve => setTimeout(resolve, 20))]);
  release(); await running;
  assert.equal(executed, false);
  assert.equal(await schedule(new AbortController().signal, async () => 'next'), 'next');
});

test('the waiting queue is bounded and failed reads release a slot', async () => {
  const schedule = privateImageQueue(1, 1);
  let release!: () => void;
  const first = schedule(new AbortController().signal, () => new Promise<void>(resolve => { release = resolve; }));
  const second = schedule(new AbortController().signal, async () => { throw new Error('forbidden'); });
  await assert.rejects(schedule(new AbortController().signal, async () => 'never'), /ASSET_TRANSFER_BUSY/);
  release(); await first; await assert.rejects(second, /forbidden/);
  assert.equal(await schedule(new AbortController().signal, async () => 'next'), 'next');
});
