import assert from 'node:assert/strict';
import test from 'node:test';
import { adaptiveSurfaceLayout } from '../src/svelte/catalog/foundations/modal/adaptive-surface-layout.ts';

test('approved pane-fit and dock-fit boundaries are independent and have no width cliff', () => {
  const expected = [
    [599, false, 'bottom', 575], [600, false, 'right', 576], [601, false, 'right', 576],
    [1319, false, 'right', 576], [1320, true, 'right', 576], [1321, true, 'right', 576],
  ] as const;
  for (const [width, docked, edge, paneWidth] of expected) {
    const result = adaptiveSurfaceLayout(width, 16, true);
    assert.deepEqual([result.docked, result.edge, result.paneWidth], [docked, edge, paneWidth]);
  }
});

test('only a reservable host docks; enlarged text scales both independent budgets', () => {
  assert.equal(adaptiveSurfaceLayout(2000, 16, false).docked, false);
  assert.equal(adaptiveSurfaceLayout(2000, 32, true).docked, false);
  assert.equal(adaptiveSurfaceLayout(2616, 32, true).docked, true);
  assert.equal(adaptiveSurfaceLayout(1175, 32, true).edge, 'bottom');
  assert.equal(adaptiveSurfaceLayout(1176, 32, true).edge, 'right');
});
