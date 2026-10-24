import test from 'node:test';
import assert from 'node:assert/strict';
import { publicCatalogFixture } from './public-catalog-fixture.ts';
import { navigationAction, settle } from './public-catalog-expectations.ts';
import { compactToolbarEvidence, compactEvidenceDirectory } from './compact-toolbar-expectations.ts';

for (const width of [390, 1280]) for (const scale of [1, 2]) {
  for (const place of ['browse', 'bank', 'travel-kit']) test(`compact ${place} is one title-and-icon rail at ${width}px text${scale}`, async () => {
    const f = await publicCatalogFixture(); const { page } = f;
    try {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(value => document.documentElement.style.setProperty('--text-scale', String(value)), scale);
      if (place !== 'browse') await (await navigationAction(page, place === 'bank' ? 'Component bank' : 'Travel kit')).click();
      await settle(page);
      await page.locator('[data-catalog-scroll]').evaluate(element => element.scrollTop = 1400); await settle(page);
      const state = await compactToolbarEvidence(page, `${place}-${width}-text${scale}`);
      const failures: string[] = [];
      if (state.condensed !== 'true') failures.push('The header never reached its completed compact presentation');
      if (state.summary.length) failures.push(`Compact title retains summary text: ${JSON.stringify(state.summary)}`);
      if (state.searchboxes) failures.push('Compact chrome contains an expanded search field');
      const tallestAction = Math.max(44, ...state.buttons.map(button => button.height));
      if (state.header.height > Math.max(tallestAction, state.title.lineHeight) + 24 + 1)
        failures.push(`Header${state.header.height}px exceeds a single rail plus24px insets`);
      const lines = new Set(state.title.fragments.map(fragment => Math.round(fragment.top)));
      if (!lines.size) failures.push('No title is painted in the compact rail');
      if (lines.size > 1) failures.push(`Compact title occupies${lines.size} painted lines`);
      const centers = state.buttons.map(button => (button.top + button.bottom) / 2);
      if (centers.length && Math.max(...centers) - Math.min(...centers) > 2) failures.push('Actions occupy different vertical rails');
      for (const button of state.buttons) {
        if (button.left < state.header.left - 1 || button.right > state.header.right + 1)
          failures.push(`${button.name}: action extends beyond the toolbar's inline bounds`);
        if (state.title.fragments.some(text => Math.min(text.right, button.right) - Math.max(text.left, button.left) > 1
          && Math.min(text.bottom, button.bottom) - Math.max(text.top, button.top) > 1)) failures.push(`${button.name}: overlaps painted title`);
        if (button.text.length) failures.push(`${button.name}: visible action text in compact mode`);
        if (!button.glyphs) failures.push(`${button.name}: no glyph`);
        if (button.width < 43.5 || button.height < 43.5) failures.push(`${button.name}: hit target below44px`);
        if (Math.abs(button.width - button.height) > 1) failures.push(`${button.name}: not square`);
        const radius = button.radius.endsWith('%') ? parseFloat(button.radius) * button.width / 100 : parseFloat(button.radius);
        if (radius + .5 < Math.min(button.width, button.height) / 2) failures.push(`${button.name}: not circular`);
      }
      if (state.overflow > 1) failures.push(`Document overflows by${state.overflow}px`);
      if (place === 'browse') {
        // The compact glyph is still the same meaningful action, not decoration.
        await page.locator('[data-place-header]').getByRole('button', { name: 'Learn More', exact: true }).click(); await settle(page);
        assert.ok(new URL(page.url()).searchParams.has('record'));
        assert.equal(await page.locator('[data-place-header] [data-place-title]').textContent(), 'Mount Fuji');
      }
      assert.deepEqual(failures, [], `Owner's compact-toolbar contract: ${JSON.stringify(state)}`);
    } finally { await f.close(); }
  });

  test(`bank search is an action-owned overlay at ${width}px text${scale}`, async () => {
    const f = await publicCatalogFixture(); const { page } = f;
    try {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(value => document.documentElement.style.setProperty('--text-scale', String(value)), scale);
      await (await navigationAction(page, 'Component bank')).click(); await settle(page);
      await page.locator('[data-catalog-scroll]').evaluate(element => element.scrollTop = 1400); await settle(page);
      await compactToolbarEvidence(page, `bank-search-${width}-text${scale}`);
      const trigger = page.getByRole('button', { name: 'Search', exact: true });
      assert.equal(await trigger.count(), 1, 'Bank exposes the same Search action as every Place');
      await trigger.click();
      const input = page.getByRole('searchbox', { name: 'Search component bank', exact: true });
      await input.fill('money'); await settle(page);
      const results = page.locator('[data-search-result]');
      assert.equal(await results.count(), 1, 'Search actually filters the component inventory');
      assert.match(await results.innerText(), /Money/);
      await page.keyboard.press('Escape'); await settle(page);
      assert.equal(await page.locator('[data-catalog-workspace]').getAttribute('data-search-active'), 'false');
      assert.ok(await trigger.evaluate(element => element === document.activeElement), 'Cancel returns focus to the action that opened search');
      await trigger.click(); await settle(page);
      assert.equal(await input.inputValue(), '', 'Closing shared search clears its transient query');
      await input.fill('money'); await settle(page);
      await results.getByRole('button', { name: /Money/ }).click(); await settle(page);
      const money = page.locator('[data-view-item="entry:control.money"]');
      assert.ok(await money.isVisible(), 'Selecting the result reveals the real component');
      assert.ok(await money.evaluate(element => element === document.activeElement || element.contains(document.activeElement)), 'Reveal gives the component keyboard context');
      await page.screenshot({ path: `${compactEvidenceDirectory}/bank-search-result-${width}-text${scale}.png` });
    } finally { await f.close(); }
  });
}
