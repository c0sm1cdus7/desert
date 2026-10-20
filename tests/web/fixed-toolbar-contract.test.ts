import test from 'node:test';
import assert from 'node:assert/strict';
import { publicCatalogFixture } from './public-catalog-fixture.ts';
import { navigationAction, settle } from './public-catalog-expectations.ts';
import { fixedChromeState, saveFixedEvidence } from './fixed-toolbar-expectations.ts';

// Owner's v107 correction, recorded against rejected v106i before implementation:
// headers scroll as content; toolbars remain ordinary fixed rails. No CTA migration.
for (const width of [390, 1280]) for (const scale of [1, 2]) {
  for (const place of ['browse', 'bank', 'travel-kit']) test(`separate ${place} header and fixed rails at ${width}px text${scale}`, async () => {
    const f = await publicCatalogFixture(); const { page } = f;
    try {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(value => document.documentElement.style.setProperty('--text-scale', String(value)), scale);
      if (place !== 'browse') await (await navigationAction(page, place === 'bank' ? 'Component bank' : 'Travel kit')).click();
      await settle(page);
      const states = [];
      for (const scroll of [0, 200, 1400]) {
        await page.locator('[data-catalog-scroll]').evaluate((element, value) => element.scrollTop = value, scroll); await settle(page);
        states.push(await fixedChromeState(page));
      }
      await saveFixedEvidence(page, `${place}-${width}-text${scale}`, states);
      const failures: string[] = [], initial = states[0]!, last = states.at(-1)!;
      if (!initial.title?.inViewport || initial.title.inToolbar) failures.push('Semantic page title is not ordinary scroll content outside toolbars');
      if (!initial.header?.inViewport || initial.header.toolbar) failures.push('Page header is not a separate content header');
      if (!initial.bars.some(bar => bar.edge === 'top')) failures.push('No fixed top toolbar');
      for (const state of states) {
        if (state.overflow > 1) failures.push(`Horizontal overflow ${state.overflow}px`);
        for (let index = 0; index < state.bars.length; index++) {
          const bar = state.bars[index]!, first = initial.bars[index]!;
          if (Math.abs(bar.y - first.y) > 1 || Math.abs(bar.height - first.height) > 1) failures.push(`${bar.edge} rail changes position/height with scroll`);
          if (bar.searchFields) failures.push('Collapsed toolbar exposes an inline search field');
          if (bar.buttons.some(button => button.name === 'Learn More')) failures.push('Header CTA migrated into a toolbar');
          const actionHeight = Math.max(44, ...bar.buttons.map(button => button.height));
          if (bar.height > actionHeight + 24 + 1) failures.push(`${bar.edge} exceeds one action rail plus24px insets`);
        }
      }
      if (initial.header && last.header && Math.abs((initial.header.y - last.header.y) - last.scrollTop) > 1)
        failures.push('Header movement is not the natural scroll displacement');
      if (place === 'browse' && (!last.cta?.inViewport || last.cta.inToolbar || last.cta.hit)) failures.push('Learn More does not leave with its header');
      assert.deepEqual(failures, []);
      if (place === 'browse') {
        await page.locator('[data-catalog-scroll]').evaluate(element => element.scrollTop = 0); await settle(page);
        await page.getByRole('button', { name: 'Learn More', exact: true }).click(); await settle(page);
        assert.ok(new URL(page.url()).searchParams.has('record'), 'The ordinary header CTA still performs its real navigation');
      }
    } finally { await f.close(); }
  });
  test(`fixed bank Search action retains filtering and focus at ${width}px text${scale}`, async () => {
    const f = await publicCatalogFixture(); const { page } = f;
    try {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(value => document.documentElement.style.setProperty('--text-scale', String(value)), scale);
      await (await navigationAction(page, 'Component bank')).click(); await settle(page);
      const trigger = page.getByRole('button', { name: 'Search', exact: true });
      await trigger.click();
      const input = page.getByRole('searchbox', { name: 'Search component bank', exact: true });
      await input.fill('money'); await settle(page);
      assert.equal(await page.locator('[data-search-result]').count(), 1);
      assert.match(await page.locator('[data-search-result]').innerText(), /Money/);
      await page.keyboard.press('Escape'); await settle(page);
      assert.ok(await trigger.evaluate(element => element === document.activeElement));
      assert.equal(await page.locator('[data-catalog-workspace]').getAttribute('data-search-active'), 'false');
    } finally { await f.close(); }
  });
}
