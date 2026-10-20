import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { publicCatalogFixture } from './public-catalog-fixture.ts';
import { settle } from './public-catalog-expectations.ts';

// Owner contract: titled stacks arrange content, wells belong to individual
// inputs, and only actual grouped rows/lists receive a quiet shared pane.
for (const place of ['bank', 'travel-kit']) test(`${place}: surface ownership follows semantic content, not stack nesting`, async () => {
  const f = await publicCatalogFixture();
  try {
    const { page } = f;
    await page.goto(`${f.origin}/?place=${place}`);
    const observations: unknown[] = [];
    const failures: unknown[] = [];
    for (const colorScheme of ['light', 'dark'] as const) for (const { width, scale } of [{ width: 320, scale: 2 }, { width: 1280, scale: 1 }]) {
      await page.emulateMedia({ colorScheme });
      await page.setViewportSize({ width, height: 950 });
      await page.evaluate(value => document.documentElement.style.setProperty('--text-scale', String(value)), scale);
      await settle(page);
      const paint = await page.evaluate(() => {
        const transparent = (color: string) => color === 'transparent' || /(?:rgba\([^)]*,\s*0\)|\/\s*0\))$/.test(color);
        const inspect = (selector: string) => [...document.querySelectorAll(selector)].filter(element => element.checkVisibility()).map(element => {
          const style = getComputedStyle(element);
          const borderPaint = ['Top', 'Right', 'Bottom', 'Left'].some(edge =>
            parseFloat(style.getPropertyValue(`border-${edge.toLowerCase()}-width`)) > 0
              && !transparent(style.getPropertyValue(`border-${edge.toLowerCase()}-color`)));
          return { text: element.textContent?.slice(0, 80), background: style.backgroundColor, image: style.backgroundImage,
            shadow: style.boxShadow, filter: style.backdropFilter, borderPaint,
            paints: !transparent(style.backgroundColor) || style.backgroundImage !== 'none',
            titleInsidePane: !!element.querySelector(':scope > legend, :scope > header') };
        });
        return { stacks: inspect('.place-stack, .place-stack-content'), wells: inspect('[data-floating-field]'),
          lists: inspect('[data-grouped-panel]'), scroll: document.querySelector('[data-catalog-scroll]')!.scrollWidth,
          available: document.querySelector('[data-catalog-scroll]')!.clientWidth };
      });
      assert.ok(paint.stacks.length > 0 && paint.wells.length >= 3 && paint.lists.length >= 1, 'All three surface roles are actually exercised');
      for (const stack of paint.stacks) if (stack.paints || stack.borderPaint || stack.shadow !== 'none')
        failures.push({ colorScheme, width, role: 'stack', violation: 'A layout stack paints a container', stack });
      for (const well of paint.wells) if (!well.paints && !well.borderPaint)
        failures.push({ colorScheme, width, role: 'well', violation: 'An individual input loses its visible well', well });
      for (const list of paint.lists) if (!list.paints || list.borderPaint || list.filter !== 'none' || list.shadow !== 'none')
        failures.push({ colorScheme, width, role: 'list', violation: 'Grouped rows need one quiet, borderless pane', list });
      if (paint.scroll > paint.available + 1) failures.push({ colorScheme, width, violation: 'Horizontal overflow', paint });
      observations.push({ colorScheme, width, scale, paint });
    }
    const directory = `artifacts/stack-surface-ownership/${process.env.DESERT_CATALOG_BUILD?.split('/').pop()}`;
    await mkdir(directory, { recursive: true });
    await writeFile(`${directory}/${place}.json`, JSON.stringify({ observations, failures }, null, 2));
    assert.equal(failures.length, 0, `Surface anatomy follows the owner contract; ${failures.length} violations recorded in ${directory}/${place}.json`);
  } finally { await f.close(); }
});
