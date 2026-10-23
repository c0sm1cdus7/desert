import test from 'node:test';
import assert from 'node:assert/strict';
import { clientEditFixture, until } from './fixtures/client-edit.ts';
import { subjectActionAvailable } from '../src/web/client/state.ts';

function gate() {
  let entered!: () => void, release!: () => void;
  const started = new Promise<void>(resolve => { entered = resolve; });
  const waiting = new Promise<void>(resolve => { release = resolve; });
  return { started, release, wait: async () => { entered(); await waiting; } };
}

test('projected subject actions reject an offer from another version of the displayed detail', async t => {
  const f = await clientEditFixture(t);
  try {
    f.control.offerVersion = 2; await f.model.select('selected-record');
    assert.equal(subjectActionAvailable(f.surface, f.model.snapshot(), f.mutation.id, undefined, undefined, f.scope), false);
    const content = f.frame().content;
    assert.equal(content.kind, 'context');
    assert.equal(content.actions.find(action => action.destination === f.mutation.id)?.available, false);
  } finally { f.model.stop(); }
});

test('newer edit draft during preparation is not silently accepted', async t => {
  const f = await clientEditFixture(t), pending = gate();
  try {
    f.model.startEdit(f.mutation.id); f.model.edit('body', 'First edit'); f.control.beforePrepare = pending.wait;
    const submitting = f.model.invoke(f.mutation); await pending.started;
    f.model.edit('body', 'Newer edit'); pending.release(); await submitting;
    assert.deepEqual(f.writes().map(call => call.operation), ['prepare']);
    assert.equal(f.model.snapshot().prepared, null);
    assert.equal(f.model.snapshot().view, 'edit');
    assert.equal(f.model.snapshot().editing?.expectedVersion, 1);
    assert.equal(f.model.snapshot().draft.body, 'Newer edit');
  } finally { pending.release(); f.model.stop(); }
});

test('newer writing during acceptance survives and uses the acknowledged version as its next base', async t => {
  const f = await clientEditFixture(t), pending = gate();
  try {
    f.model.startEdit(f.mutation.id); f.model.edit('body', 'First accepted edit'); f.control.beforeAccept = pending.wait;
    const submitting = f.model.invoke(f.mutation); await pending.started;
    await f.model.invoke(f.mutation);
    f.model.edit('body', 'Next unsaved edit'); pending.release(); await submitting;
    assert.deepEqual(f.writes().map(call => call.operation), ['prepare', 'accept'], 'duplicate submission is blocked');
    assert.equal(f.control.record.facts.body, 'First accepted edit');
    assert.equal(f.model.snapshot().view, 'edit');
    assert.equal(f.model.snapshot().editing?.expectedVersion, 2);
    assert.equal(f.model.snapshot().editing?.facts.body, 'First accepted edit');
    assert.equal(f.model.snapshot().draft.body, 'Next unsaved edit');
    await f.model.invoke(f.mutation);
    assert.deepEqual(f.writes()[2]!.body.options, { expectedVersion: 2 });
    assert.equal(f.model.snapshot().view, 'detail');
    assert.equal(f.control.record.facts.body, 'Next unsaved edit');
  } finally { pending.release(); f.model.stop(); }
});

test('a refreshed ineligible offer disables an existing editor without discarding writing', async t => {
  const f = await clientEditFixture(t);
  try {
    f.model.startEdit(f.mutation.id); f.model.edit('body', 'Retain this');
    f.control.connected = false;
    await until(() => !f.model.snapshot().availability.journeys[f.mutation.id]?.dependenciesReady);
    f.control.eligible = false; f.control.connected = true;
    await until(() => f.model.snapshot().offers[f.mutation.id]?.eligible === false);
    assert.equal(f.frame().bottom.primary?.state, 'unavailable');
    await f.model.invoke(f.mutation);
    assert.deepEqual(f.writes(), []);
    assert.equal(f.model.snapshot().draft.body, 'Retain this');
    assert.equal(f.model.snapshot().editing?.expectedVersion, 1);
  } finally { f.model.stop(); }
});
