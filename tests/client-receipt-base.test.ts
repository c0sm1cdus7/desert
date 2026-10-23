import test from 'node:test';
import assert from 'node:assert/strict';
import { compile } from '../src/compile.ts';
import { Notebook } from '../products/notebook/product.ts';
import { humanState } from '../src/web/client/state.ts';
import { mutationFlow } from '../src/web/client/mutations.ts';
import type { HumanSurface, Prepared, Receipt, ApiMethods } from '../src/web/types.ts';
import type { Transport } from '../src/web/client/transport.ts';
import { notebookScope } from './fixtures/notebook-scope.ts';

for (const [journeyId, expectedVersion] of [
  ['archive-note', -1], ['archive-note', 0], ['archive-note', 0.5], ['archive-note', Number.MAX_SAFE_INTEGER + 1],
  ['create-note', 1], ['create-note', -1],
] as const) {
  test(`${journeyId} cannot complete from an invalid prepared version ${expectedVersion}`, async () => {
    const surface = compile(Notebook).surface('human') as HumanSurface;
    const journey = surface.journeys.find(item => item.id === journeyId)!;
    assert.equal(journey.kind, 'mutation'); if (journey.kind !== 'mutation') return;
    const prepared: Prepared = { id: 'intent', runId: 'run', journeyId,
      object: { id: 'record', type: journey.object, expectedVersion }, facts: {}, confirmationDigest: 'confirmation' };
    const receipt: Receipt = { id: prepared.id, runId: prepared.runId, commandId: journey.commandId, status: 'completed',
      object: { id: prepared.object.id, type: journey.object, version: expectedVersion + 1 } };
    const scope = notebookScope(surface), store = humanState(surface, scope);
    store.update({ view: 'recovery', uncertain: true, prepared, mutationId: journey.id,
      availability: { contractDigest: surface.contractDigest, journeys: { [journey.id]: { dependenciesReady: true, blockers: [] } } } });
    let refreshes = 0;
    const transport: Pick<Transport, 'connect' | 'evidence' | 'call'> = { connect: async () => {}, evidence: async () => ({ snapshot: store.get().availability, validForMs: 1000 }),
      async call<K extends keyof ApiMethods>() { return receipt as ApiMethods[K]['output']; } };
    const flow = mutationFlow(surface, store, transport, () => true, async () => { refreshes++; }, scope);
    await flow.recover();
    assert.equal(store.get().error, 'INVALID_RESPONSE');
    assert.equal(store.get().prepared, prepared);
    assert.equal(store.get().uncertain, true);
    assert.equal(refreshes, 0);
  });
}
