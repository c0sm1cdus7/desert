import assert from 'node:assert/strict';
import test from 'node:test';
import { basename } from 'node:path';
import { publicCatalogFixture } from './public-catalog-fixture.ts';
import { evidence, settle } from './public-catalog-expectations.ts';

test('overlay navigation docks without losing its perimeter, draft or content alignment', async () => {
  const f = await publicCatalogFixture();
  try {
    const { page } = f;
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(`${f.origin}/?place=travel-kit`); await settle(page);
    const input = page.getByRole('textbox', { name: 'Trip name', exact: false });
    await input.fill('The same local draft'); const original = await input.elementHandle();
    await page.getByRole('button', { name: 'Show navigation', exact: true }).click(); await settle(page);
    await page.evaluate(() => {
      const capture = { active: true, frames: [] as { role: string; border: string[] }[][] };
      (window as unknown as { boundaryCapture: typeof capture }).boundaryCapture = capture;
      function sample() {
        const panes = [...document.querySelectorAll('[data-slot="sidebar-inner"], [data-sidebar="sidebar"][data-presentation="overlay"]')]
          .filter(element => element.checkVisibility()).map(element => {
            const css = getComputedStyle(element);
            return { role: element.getAttribute('data-presentation') ?? 'docked',
              border: ['top', 'right', 'bottom', 'left'].map(edge => css.getPropertyValue(`border-${edge}-width`)) };
          });
        capture.frames.push(panes);
        if (capture.active) requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    });
    const observations = [];
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 900 }); await settle(page);
      assert.equal(await input.inputValue(), 'The same local draft');
      assert.equal(await original!.evaluate(element => element.isConnected), true, 'The editor is not remounted');
      const geometry = await page.evaluate(() => {
        const heading = document.querySelector('[data-place-header] h1')!.getBoundingClientRect();
        const labels = [...document.querySelectorAll('[data-control-measure]:not([data-control-measure="amount"]) [data-slot="field-label"]')]
          .map(element => element.getBoundingClientRect().left);
        const scroll = document.querySelector('[data-catalog-scroll]')!;
        const pane = document.querySelector('[data-slot="sidebar-inner"], [data-sidebar="sidebar"][data-presentation="overlay"]')!;
        const box = pane.getBoundingClientRect(), css = getComputedStyle(pane);
        return { heading: heading.left, labels, overflow: scroll.scrollWidth > scroll.clientWidth,
          pane: { x: box.x, y: box.y, right: box.right, bottom: box.bottom }, radius: css.borderRadius,
          shadow: css.boxShadow, viewport: { width: innerWidth, height: innerHeight } };
      });
      assert.ok(geometry.labels.every(x => Math.abs(x - geometry.heading) <= 1), 'All standalone field text retains the header axis');
      assert.equal(geometry.overflow, false, 'The border does not produce horizontal overflow');
      assert.ok(geometry.pane.x >= 0 && geometry.pane.y >= 0 && geometry.pane.right <= width && geometry.pane.bottom <= 900);
      assert.ok(parseFloat(geometry.radius) > 0, 'The perimeter follows rounded corners');
      if (width === 1280) assert.equal(geometry.shadow, 'none', 'Docked sidebar does not add its previous inset stroke');
      observations.push({ width, geometry });
    }
    const frames = await page.evaluate(() => {
      const capture = (window as unknown as { boundaryCapture: { active: boolean; frames: { role: string; border: string[] }[][] } }).boundaryCapture;
      capture.active = false; return capture.frames;
    });
    await evidence(page, `surface-boundary-docking-${basename(process.env.DESERT_CATALOG_BUILD ?? 'default')}`, { observations, frames });
    assert.ok(frames.some(frame => frame.some(pane => pane.role === 'overlay')));
    assert.ok(frames.some(frame => frame.some(pane => pane.role === 'docked')));
    for (const frame of frames) {
      assert.ok(frame.length > 0, 'Navigation stays visibly mounted across docking');
      for (const pane of frame) assert.deepEqual(pane.border, ['1px', '1px', '1px', '1px']);
    }
  } finally { await f.close(); }
});
