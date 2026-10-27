import test from 'node:test';
import assert from 'node:assert/strict';
import { basename } from 'node:path';
import { publicCatalogFixture } from './public-catalog-fixture.ts';
import { evidence, navigationAction, settle } from './public-catalog-expectations.ts';
import { focusState, shellState } from './public-catalog-focus-expectations.ts';
import { navigateWithKeyboard } from './native-keyboard-navigation.ts';

// Independent requirements after the owner's removal of category shortcuts:
// one bank search, not duplicate search chrome; returning reaches that input;
// filtering/return preserves specimen drafts, query and route; ordinary keyboard
// order and exposed focus survive the header's expanded/condensed layout.
const build = basename(process.env.DESERT_CATALOG_BUILD ?? 'build/landmarks-web-v1');
for (const width of [390, 900, 1100]) for (const mode of ['pointer', 'keyboard'] as const) {
  test(`${mode} return to the bank's single search retains draft, focus and viewport at ${width}px`, async () => {
    const f = await publicCatalogFixture();
    try {
      const { page } = f;
      await page.setViewportSize({ width, height: 740 });
      if (mode === 'keyboard') await navigateWithKeyboard(page, 'Component bank');
      else await (await navigationAction(page, 'Component bank')).click();
      await settle(page);
      const bank = page.locator('[data-view-item="public-catalog-bank"]');
      const input = page.getByRole('searchbox', { name: 'Find component', exact: true });
      assert.equal(await input.count(), 1, 'Exactly one local bank search is mounted');
      assert.equal(await page.getByRole('button', { name: 'Search', exact: true }).count(), 0,
        'No competing global search affordance belongs to the bank');
      const writing = page.locator('[data-view-item="specimen:input.text:value"]').getByRole('textbox');
      await writing.fill('Draft survives filtering and return');
      await input.fill('control');
      const route = page.url(), initial = await shellState(page);
      const firstControl = bank.locator('button:not([disabled]), input:not([disabled]), textarea:not([disabled])').filter({ visible: true }).first();
      for (let attempt = 0; attempt < 12 && !await firstControl.evaluate(element => element === document.activeElement); attempt++)
        await page.keyboard.press('Tab');
      assert.ok(await firstControl.evaluate(element => element === document.activeElement), 'Native Tab reaches the first bank control from its search');
      // Category return links were removed with their redundant headings. The
      // persistent search must instead remain directly reachable by both modes.
      if (mode === 'keyboard') {
        for (let attempt = 0; attempt < 12 && !await input.evaluate(element => element === document.activeElement); attempt++)
          await page.keyboard.press('Shift+Tab');
      } else await input.click();
      await settle(page);
      const focus = await focusState(input), shell = await shellState(page);
      await evidence(page, `bank-search-${mode}-${width}-${build}`, { focus, shell, route });
      assert.ok(focus.focused, 'Return targets the usable search, not a wrapper');
      assert.ok(focus.top >= 0 && focus.bottom <= focus.viewportHeight, 'Search is onscreen');
      assert.ok(focus.hitTests.every(point => point.exposed), `Search is not covered: ${JSON.stringify(focus)}`);
      assert.equal(shell.rootScroll, initial.rootScroll, 'Local return does not scroll the document');
      assert.equal(shell.workspaceScroll, 0, 'Fixed workspace does not become a hidden scroll owner');
      assert.equal(page.url(), route, 'Return does not navigate or append a fragment');
      assert.equal(await input.inputValue(), 'control', 'Return retains the search query');
      if (mode === 'keyboard') {
        assert.ok(focus.visibleFocus && focus.outlineWidth > 0, 'Search has a visible keyboard outline');
        await page.keyboard.press('Tab');
        const clear = page.getByRole('button', { name: 'Clear search', exact: true });
        assert.ok(await clear.evaluate(element => element === document.activeElement), 'Tab reaches the search accessory');
        await page.keyboard.press('Shift+Tab');
        assert.ok(await input.evaluate(element => element === document.activeElement), 'Reverse Tab returns to the search');
      }
      await input.fill('');
      assert.equal(await writing.inputValue(), 'Draft survives filtering and return');
    } finally { await f.close(); }
  });
}
