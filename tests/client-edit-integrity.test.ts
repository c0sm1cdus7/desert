import test from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { clientEditFixture, until } from './fixtures/client-edit.ts';
import type { Receipt } from '../src/web/types.ts';
import { failureFeedback } from '../src/web/client/failure-feedback.ts';

function gate() {
  let entered!: () => void, release!: () => void;
  const started = new Promise<void>(resolve => { entered = resolve; });
  const waiting = new Promise<void>(resolve => { release = resolve; });
  return { started, release, wait: async () => { entered(); await waiting; } };
}

const corruptions: Record<string, (receipt: Receipt) => unknown> = {
  intent: receipt => ({ ...receipt, id: 'another-intent' }),
  run: receipt => ({ ...receipt, runId: 'another-run' }),
  command: receipt => ({ ...receipt, commandId: 'another-command' }),
  status: receipt => ({ ...receipt, status: 'pending' }),
  subject: receipt => ({ ...receipt, object: { ...receipt.object, id: 'another-record' } }),
  type: receipt => ({ ...receipt, object: { ...receipt.object, type: 'another-type' } }),
  version: receipt => ({ ...receipt, object: { ...receipt.object, version: 999 } }),
  missing: () => null,
};

for (const [field, corrupt] of Object.entries(corruptions)) {
  test(`an acceptance receipt with mismatched ${field} cannot advance the edit base`, async t => {
    const f = await clientEditFixture(t), pending = gate(), fetch = globalThis.fetch;
    t.mock.method(globalThis, 'fetch', async (url: string, init?: RequestInit) => {
      const response = await fetch(url, init);
      return url.endsWith('/accept') ? new Response(JSON.stringify(corrupt(await response.json()))) : response;
    });
    try {
      f.model.startEdit(f.mutation.id); f.model.edit('body', 'Accepted edit'); f.control.beforeAccept = pending.wait;
      const submitting = f.model.invoke(f.mutation); await pending.started;
      f.model.edit('body', 'Newer unsaved writing'); pending.release(); await submitting;
      assert.equal(f.control.record.version, 2, 'the real controller committed once');
      assert.equal(f.model.snapshot().view, 'recovery');
      assert.equal(f.model.snapshot().error, 'INVALID_RESPONSE');
      assert.equal(f.model.snapshot().uncertain, true);
      assert.equal(f.model.snapshot().prepared?.id, 'edit-intent');
      assert.equal(f.model.snapshot().editing?.expectedVersion, 1);
      assert.equal(f.model.snapshot().draft.body, 'Newer unsaved writing');
      await f.model.recover();
      assert.equal(f.model.snapshot().editing?.expectedVersion, 2, 'only a correlated receipt can advance the base');
      assert.equal(f.model.snapshot().view, 'edit');
      assert.deepEqual(f.writes().map(call => call.operation), ['prepare', 'accept']);
    } finally { pending.release(); f.model.stop(); }
  });
}

for (const field of ['run', 'command', 'status', 'type', 'version']) {
  test(`receipt lookup rejects mismatched ${field} without losing the original confirmation`, async t => {
    const f = await clientEditFixture(t), fetch = globalThis.fetch;
    t.mock.method(globalThis, 'fetch', async (url: string, init?: RequestInit) => {
      const response = await fetch(url, init);
      return url.endsWith('/receipt') ? new Response(JSON.stringify(corruptions[field]!(await response.json()))) : response;
    });
    try {
      f.model.startEdit(f.mutation.id); f.model.edit('body', 'Saved once'); f.control.lostAcceptance = true;
      await f.model.invoke(f.mutation); await f.model.recover();
      assert.equal(f.model.snapshot().error, 'INVALID_RESPONSE');
      assert.equal(f.model.snapshot().view, 'recovery');
      assert.equal(f.model.snapshot().editing?.expectedVersion, 1);
      assert.equal(f.model.snapshot().prepared?.id, 'edit-intent');
      assert.deepEqual(f.writes().map(call => call.operation), ['prepare', 'accept']);
    } finally { f.model.stop(); }
  });
}

test('matching forged object types in preparation and receipt cannot bypass the canonical journey object', async t => {
  const f = await clientEditFixture(t), fetch = globalThis.fetch;
  t.mock.method(globalThis, 'fetch', async (url: string, init?: RequestInit) => {
    const response = await fetch(url, init);
    if (!url.endsWith('/prepare') && !url.endsWith('/accept')) return response;
    const result = await response.json(); result.object.type = 'another-type';
    return new Response(JSON.stringify(result));
  });
  try {
    f.model.startEdit(f.mutation.id); f.model.edit('body', 'Submitted text'); await f.model.invoke(f.mutation);
    assert.equal(f.model.snapshot().error, 'INVALID_RESPONSE');
    assert.equal(f.model.snapshot().editing?.expectedVersion, 1);
    assert.equal(f.model.snapshot().prepared?.id, 'edit-intent');
  } finally { f.model.stop(); }
});

for (const failures of [1, 2]) {
  test(`a confirmed edit tolerates ${failures} refresh failure(s) with a bounded read-only retry`, async t => {
    const f = await clientEditFixture(t), pending = gate(), fetch = globalThis.fetch;
    let accepted = false, reads = 0;
    t.mock.method(globalThis, 'fetch', async (url: string, init?: RequestInit) => {
      if (accepted && url.endsWith('/read') && ++reads <= failures) {
        return new Response(JSON.stringify({ error: 'CONNECTION_LOST' }), { status: 503 });
      }
      const response = await fetch(url, init);
      if (url.endsWith('/accept')) accepted = true;
      return response;
    });
    try {
      f.model.startEdit(f.mutation.id); f.model.edit('body', 'Accepted edit'); f.control.beforeAccept = pending.wait;
      const submitting = f.model.invoke(f.mutation); await pending.started;
      f.model.edit('body', 'Newer unsaved writing'); pending.release(); await submitting;
      const current = f.model.snapshot();
      assert.equal(current.availability.journeys[f.mutation.id]?.dependenciesReady, true);
      assert.equal(current.view, 'edit'); assert.equal(current.uncertain, false); assert.equal(current.prepared, null);
      assert.equal(current.editing?.expectedVersion, 2); assert.equal(current.draft.body, 'Newer unsaved writing');
      if (failures === 1) {
        assert.equal(current.error, null);
        assert.equal(current.detail?.version, 2);
        assert.equal(current.offers[f.mutation.id]?.version, 2);
        assert.equal(f.frame().bottom.primary?.state, 'ready');
        assert.equal(reads, 3, 'one failed read, then successful collection and selected-record reads');
      } else {
        assert.equal(current.error, 'READ_REFRESH_FAILED', 'confirmed write remains saved; only its read failed');
        assert.deepEqual(failureFeedback(current.error), { title: 'We couldn’t refresh the data',
          description: 'The latest data could not be loaded. Your unsent changes are preserved.' });
        assert.equal(f.frame().bottom.primary?.state, 'unavailable');
        assert.equal(reads, 2, 'a refresh cycle retries only once');
      }
      await delay(550);
      assert.equal(reads, failures === 1 ? 3 : 2, 'ready availability polls do not create an unbounded retry loop');
      if (failures === 2) {
        f.model.setReading(false); f.model.setReading(true);
        await until(() => f.model.snapshot().detail?.version === 2);
        assert.equal(f.model.snapshot().error, null, 'a later successful read clears only the read failure');
        assert.equal(f.frame().bottom.primary?.state, 'ready');
        assert.equal(f.model.snapshot().draft.body, 'Newer unsaved writing');
      }
      assert.deepEqual(f.writes().map(call => call.operation), ['prepare', 'accept']);
    } finally { pending.release(); f.model.stop(); }
  });
}

test('a failed stale refresh cannot retry or overwrite the newly selected record', async t => {
  const f = await clientEditFixture(t), pending = gate(), fetch = globalThis.fetch;
  let firstRead = true, reads = 0;
  t.mock.method(globalThis, 'fetch', async (url: string, init?: RequestInit) => {
    if (url.endsWith('/read')) {
      reads++;
      if (firstRead) {
        firstRead = false; await pending.wait();
        return new Response(JSON.stringify({ error: 'CONNECTION_LOST' }), { status: 503 });
      }
    }
    return fetch(url, init);
  });
  try {
    const stale = f.model.select('selected-record'); await pending.started;
    f.control.record = { ...f.control.record, id: 'new-selection', version: 4 };
    await f.model.select('new-selection'); pending.release(); await stale;
    assert.equal(f.model.snapshot().selectedId, 'new-selection');
    assert.equal(f.model.snapshot().detail?.id, 'new-selection');
    assert.equal(f.model.snapshot().error, null);
    assert.equal(reads, 3, 'only the current selection can complete its collection/detail reads');
    assert.deepEqual(f.writes(), []);
  } finally { pending.release(); f.model.stop(); }
});

for (const cancel of ['stop', 'pause'] as const) {
  test(`${cancel} cancels the post-accept read retry without changing the retained draft`, async t => {
    const f = await clientEditFixture(t), pending = gate(), fetch = globalThis.fetch;
    let accepted = false, reads = 0;
    t.mock.method(globalThis, 'fetch', async (url: string, init?: RequestInit) => {
      if (accepted && url.endsWith('/read')) {
        reads++;
        if (cancel === 'stop') f.model.stop(); else f.model.setReading(false);
        return new Response(JSON.stringify({ error: 'CONNECTION_LOST' }), { status: 503 });
      }
      const response = await fetch(url, init);
      if (url.endsWith('/accept')) accepted = true;
      return response;
    });
    try {
      f.model.startEdit(f.mutation.id); f.model.edit('body', 'Accepted edit'); f.control.beforeAccept = pending.wait;
      const submitting = f.model.invoke(f.mutation); await pending.started;
      f.model.edit('body', 'Newer unsaved writing'); pending.release(); await submitting;
      assert.equal(reads, 1); assert.equal(f.model.snapshot().error, null);
      assert.equal(f.model.snapshot().editing?.expectedVersion, 2);
      assert.equal(f.model.snapshot().draft.body, 'Newer unsaved writing');
      assert.deepEqual(f.writes().map(call => call.operation), ['prepare', 'accept']);
    } finally { pending.release(); f.model.stop(); }
  });
}
