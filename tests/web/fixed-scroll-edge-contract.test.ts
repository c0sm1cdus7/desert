import test from 'node:test';
import assert from 'node:assert/strict';
import { publicCatalogFixture } from './public-catalog-fixture.ts';
import { settle } from './public-catalog-expectations.ts';
import { saveFixedEvidence } from './fixed-toolbar-expectations.ts';

for (const colorScheme of ['light', 'dark'] as const) test(`default scroll edges preserve the approved black24% feather in ${colorScheme}`, async () => {
  const f = await publicCatalogFixture(); const { page } = f;
  try {
    await page.setViewportSize({ width: 390, height: 900 }); await page.emulateMedia({ colorScheme }); await settle(page);
    await page.locator('[data-catalog-scroll]').evaluate(element => element.scrollTop = 600); await settle(page);
    const state = await page.locator('[data-catalog-content]').evaluate(owner => {
      const bars = [...owner.querySelectorAll('[data-toolbar]')].filter(bar => bar.closest('[data-scroll-owner]') === owner);
      return { ownerPaint: ['::before', '::after'].map(pseudo => getComputedStyle(owner, pseudo).backgroundImage), edges: ['top', 'bottom'].map(direction => {
        const element = owner.querySelector(`[data-scroll-edge="${direction}"]`)!;
        const style = getComputedStyle(element), paint = getComputedStyle(element, '::after');
        return { direction, gradient: paint.backgroundImage, opacity: paint.opacity,
          feather: element.getBoundingClientRect().height - parseFloat(style.getPropertyValue('--edge-core')),
          filters: [style.filter, style.backdropFilter, paint.filter, paint.backdropFilter], pointer: style.pointerEvents };
      }), bars: bars.map(bar => ({ background: getComputedStyle(bar).backgroundColor,
        beforeBackground: getComputedStyle(bar, '::before').backgroundColor, beforeImage: getComputedStyle(bar, '::before').backgroundImage })) };
    });
    await saveFixedEvidence(page, `approved-edge-${colorScheme}`, state);
    const failures: string[] = [];
    assert.deepEqual(state.ownerPaint, ['none', 'none'], 'No second reading fade may strengthen only one edge');
    for (const edge of state.edges) {
      if (!/rgba\(0, 0, 0, 0\.24\)/.test(edge.gradient)) failures.push(`${edge.direction} does not use black at24%: ${edge.gradient}`);
      if (Math.abs(edge.feather - 32) > 1) failures.push(`${edge.direction} feather is ${edge.feather}, not32px`);
      if (edge.filters.some(filter => filter !== 'none')) failures.push(`${edge.direction} adds blur instead of the approved fade`);
      assert.equal(edge.opacity, '1'); assert.equal(edge.pointer, 'none');
    }
    const normalized = state.edges.map(edge => edge.gradient.replace(/to (?:top|bottom),\s*/, '').replace(/\s-?[\d.]+px(?=,)/g, ' CORE'));
    assert.equal(normalized[0], normalized[1], 'Top and bottom mirror the same colors and shape');
    for (const bar of state.bars) {
      if (bar.background !== 'rgba(0, 0, 0, 0)' || bar.beforeBackground !== 'rgba(0, 0, 0, 0)' || bar.beforeImage !== 'none')
        failures.push('Toolbar adds a second painted slab over the shared scroll edge');
    }
    assert.deepEqual(failures, []);
  } finally { await f.close(); }
});
