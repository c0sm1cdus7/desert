import test from 'node:test';
import assert from 'node:assert/strict';
import { clientEditFixture, until } from './fixtures/client-edit.ts';

test('subject editor initializes authorized input fields and submits the original edit base', async t => {
  const f = await clientEditFixture(t);
  try {
    assert.equal(f.model.startEdit(f.mutation.id), true);
    assert.equal(f.model.snapshot().view, 'edit');
    assert.deepEqual(f.model.snapshot().draft, { title: 'Original title', body: 'Original body' });
    assert.equal(f.model.snapshot().editing?.expectedVersion, 1);
    assert.equal(f.frame().content.kind, 'form');
    assert.equal(f.frame().top.title, 'Edit entry');
    assert.deepEqual(f.frame().bottom.primary?.intent, { kind: 'journey', journey: f.mutation.id });
    f.model.edit('title', 'Revised title'); f.model.edit('body', 'Revised body');
    f.model.edit('owner', 'forged');
    await f.model.invoke(f.mutation);
    assert.deepEqual(f.writes().map(call => call.operation), ['prepare', 'accept']);
    assert.deepEqual(f.writes()[0]!.body, { runId: 'edit-run', input: { title: 'Revised title', body: 'Revised body' },
      options: { expectedVersion: 1 } });
    assert.ok(f.calls.some(call => call.operation === 'begin' && call.body.journeyId === f.mutation.id && call.body.subject === 'selected-record'));
    assert.equal(f.model.snapshot().view, 'detail');
    assert.equal(f.model.snapshot().editing, null);
    assert.equal(f.model.snapshot().detail?.facts.title, 'Revised title');
  } finally { f.model.stop(); }
});

test('opening edit requires a matching eligible subject offer and real controller evidence', async t => {
  const f = await clientEditFixture(t);
  try {
    assert.equal(f.model.startEdit(f.model.primary.id), false, 'creation is not a subject editor');
    assert.equal(f.model.startEdit('unexposed-operation'), false);
    f.control.eligible = false; await f.model.select('selected-record');
    assert.equal(f.model.startEdit(f.mutation.id), false);
    f.control.eligible = true; f.control.offerVersion = 2; await f.model.select('selected-record');
    assert.equal(f.model.startEdit(f.mutation.id), false, 'offer does not describe the displayed version');
    f.control.offerVersion = null; await f.model.select('selected-record');
    f.control.connected = false;
    await until(() => !f.model.snapshot().availability.journeys[f.mutation.id]?.dependenciesReady);
    assert.equal(f.model.startEdit(f.mutation.id), false);
    assert.deepEqual(f.writes(), []);
  } finally { f.model.stop(); }
});

test('disconnect/reconnect preserves edit draft and original base without replay or replacement', async t => {
  const f = await clientEditFixture(t);
  try {
    f.model.startEdit(f.mutation.id); f.model.edit('body', 'Unsent local writing');
    f.control.connected = false;
    await until(() => !f.model.snapshot().availability.journeys[f.mutation.id]?.dependenciesReady);
    assert.equal(f.frame().bottom.primary?.state, 'unavailable');
    await f.model.invoke(f.mutation); assert.deepEqual(f.writes(), []);
    f.control.record = { ...f.control.record, version: 2, facts: { ...f.control.record.facts, body: 'External newer writing' } };
    f.control.connected = true;
    await until(() => f.model.snapshot().detail?.version === 2);
    assert.equal(f.model.snapshot().view, 'edit');
    assert.equal(f.model.snapshot().draft.body, 'Unsent local writing');
    assert.equal(f.model.snapshot().editing?.expectedVersion, 1);
    assert.equal(f.model.snapshot().editing?.facts.body, 'Original body');
    assert.deepEqual(f.writes(), [], 'availability recovery only refreshes reads and offers');
    f.control.prepareError = 'VERSION_CONFLICT';
    await f.model.invoke(f.mutation);
    assert.equal(f.writes()[0]!.body.options && (f.writes()[0]!.body.options as { expectedVersion: number }).expectedVersion, 1);
    assert.equal(f.model.snapshot().error, 'VERSION_CONFLICT');
    assert.equal(f.model.snapshot().view, 'edit');
    assert.equal(f.model.snapshot().draft.body, 'Unsent local writing');
    assert.equal(f.writes().filter(call => call.operation === 'accept').length, 0);
  } finally { f.model.stop(); }
});

test('review Back returns to edit and cancel restores an unfinished creation draft', async t => {
  const f = await clientEditFixture(t, 'review');
  try {
    f.model.create(); f.model.edit('title', 'Unfinished creation'); f.model.edit('body', 'Keep creation'); f.model.close();
    const creation = { draft: { ...f.model.snapshot().draft }, touched: [...f.model.snapshot().touchedFields] };
    assert.equal(f.model.startEdit(f.mutation.id), true);
    f.model.edit('body', 'Edit to review'); await f.model.invoke(f.mutation);
    assert.equal(f.model.snapshot().view, 'review');
    f.model.back(); assert.equal(f.model.snapshot().view, 'edit');
    assert.equal(f.model.snapshot().draft.body, 'Edit to review');
    assert.equal(f.model.snapshot().editing?.expectedVersion, 1);
    f.model.close(); assert.equal(f.model.snapshot().view, 'detail');
    assert.equal(f.model.snapshot().editing, null);
    assert.deepEqual(f.model.snapshot().draft, creation.draft);
    assert.deepEqual(f.model.snapshot().touchedFields, creation.touched);
    f.model.create(); assert.deepEqual(f.model.snapshot().draft, creation.draft);
    assert.equal(f.writes().filter(call => call.operation === 'accept').length, 0);
  } finally { f.model.stop(); }
});

test('lost edit acceptance recovers the original receipt without issuing a replacement write', async t => {
  const f = await clientEditFixture(t);
  try {
    f.model.startEdit(f.mutation.id); f.model.edit('body', 'Saved once'); f.control.lostAcceptance = true;
    await f.model.invoke(f.mutation);
    assert.equal(f.model.snapshot().view, 'recovery');
    assert.equal(f.model.snapshot().editing?.expectedVersion, 1);
    await f.model.recover();
    assert.equal(f.model.snapshot().view, 'detail');
    assert.equal(f.model.snapshot().editing, null);
    assert.equal(f.model.snapshot().detail?.facts.body, 'Saved once');
    assert.deepEqual(f.writes().map(call => call.operation), ['prepare', 'accept']);
    assert.deepEqual(f.calls.filter(call => call.operation === 'receipt').map(call => call.body), [{ intentId: 'edit-intent' }]);
  } finally { f.model.stop(); }
});
