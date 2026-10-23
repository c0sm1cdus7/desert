import test from 'node:test';
import assert from 'node:assert/strict';
import { connectionPresentation, unavailableReason } from '../src/web/client/connection-presentation.ts';
import { runtimeFixture, until } from './fixtures/view-program-runtime.ts';

test('connection presentation distinguishes initial observation, ready and unavailable authority', () => {
  assert.equal(connectionPresentation(undefined), 'loading');
  assert.equal(connectionPresentation({dependenciesReady:false,blockers:[{dependency:'controller',reason:'unknown'}]}), 'loading');
  assert.equal(connectionPresentation({dependenciesReady:true,blockers:[]}), 'ready');
  for (const reason of ['unreachable','stale','session-required','incompatible','unavailable','disposed'] as const) {
    const availability = {dependenciesReady:false,blockers:[{dependency:'controller',reason}]};
    assert.equal(connectionPresentation(availability), 'offline');
    assert.ok(unavailableReason(availability));
  }
  assert.equal(unavailableReason({dependenciesReady:true,blockers:[]}), undefined);
});

test('lost controller keeps loaded records but blocks creation and selection; reconnect never replays writes', async t => {
  const {model, connection, calls, emit} = await runtimeFixture(t);
  model.navigate('notes');
  await until(() => model.snapshot().state.loaded);
  const before = model.snapshot().state.records;
  connection.ready = false;
  await until(() => Object.values(model.snapshot().state.availability.journeys).every(item => !item.dependenciesReady));
  const state = model.snapshot();
  const collection = Object.values(state.resolved.bindings).find(node => node.kind === 'collection');
  assert.equal(collection?.kind, 'collection');
  if (collection?.kind !== 'collection') return;
  assert.deepEqual(state.state.records, before);
  assert.equal(collection.loaded, true);
  assert.equal(collection.connection, 'offline');
  assert.equal(collection.disabled, true);
  const create = state.resolved.top?.trailing?.find(item => item.label === 'New note');
  assert.equal(create?.state, 'unavailable');
  assert.match(create?.reason ?? '', /controller/i);
  if (create) emit({kind:'surface.invoke',intent:create.intent});
  assert.equal(model.snapshot().state.view, 'list');
  connection.ready = true;
  await until(() => Object.values(model.snapshot().state.availability.journeys).every(item => item.dependenciesReady));
  assert.equal(calls.filter(item => ['prepare','accept'].includes(item.method)).length, 0);
});
