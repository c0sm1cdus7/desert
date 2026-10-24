import assert from 'node:assert/strict';
import test from 'node:test';
import { catalogLifecycleFixture as publicCatalogFixture } from './catalog-lifecycle-fixture.ts';
import { navigationAction, search, settle } from './public-catalog-expectations.ts';
import { lifecycleEvidence } from './catalog-lifecycle-evidence.ts';

for (const width of [390, 1280]) test(`history restores place scroll and drafts without resurrecting a picker at ${width}px`, async () => {
  const f = await publicCatalogFixture();
  const { page } = f;
  try {
    await page.setViewportSize({ width, height: 900 });
    await (await navigationAction(page, 'Travel kit')).click();
    const trip = page.getByRole('textbox', { name: 'Trip name', exact: true });
    await trip.fill('Draft survives navigation');
    await page.getByRole('button', { name: /^Arrival date ·/ }).click(); await settle(page);
    const travel = await lifecycleEvidence(page, `history-${width}-picker`);
    await page.goBack(); await settle(page);
    assert.equal(await page.getByRole('application').count(), 0, 'Leaving a place dismisses its calendar');
    await page.goForward(); await settle(page);
    const restored = await lifecycleEvidence(page, `history-${width}-forward`, { expectedScroll: travel.scroll });
    assert.equal(await trip.inputValue(), 'Draft survives navigation');
    assert.equal(await page.getByRole('application').count(), 0, 'Returning must not resurrect an orphan calendar');
    assert.ok(Math.abs(restored.scroll! - travel.scroll!) <= 1, 'Forward restores the retained place scroll');
    await (await navigationAction(page, 'Component bank')).click();
    await page.getByRole('searchbox', { name: 'Find component', exact: true }).fill('input');
    const writing = page.locator('[data-view-item="specimen:input.text:value"] input');
    await writing.fill('Bank draft survives too');
    const bank = await lifecycleEvidence(page, `history-${width}-bank`);
    await page.goBack(); await settle(page);
    assert.equal(await trip.inputValue(), 'Draft survives navigation');
    await page.goForward(); await settle(page);
    const bankReturn = await lifecycleEvidence(page, `history-${width}-bank-return`, { expectedScroll: bank.scroll });
    assert.equal(await writing.inputValue(), 'Bank draft survives too');
    assert.equal(await page.getByRole('searchbox', { name: 'Find component', exact: true }).inputValue(), 'input');
    assert.ok(Math.abs(bankReturn.scroll! - bank.scroll!) <= 1, 'History restores bank scroll independently');
  } finally { await f.close(); }
});

for (const width of [390, 1280]) test(`search detail history restores query, results and activation focus at ${width}px`, async () => {
  const f = await publicCatalogFixture(); const { page } = f;
  try {
    await page.setViewportSize({ width, height: 900 });
    await page.locator('[data-catalog-scroll]').evaluate(element => element.scrollTop = 400); await settle(page);
    const origin = await lifecycleEvidence(page, `search-history-${width}-origin`);
    await (await search(page)).fill('Fuji');
    const result = page.locator('[data-search-result]').getByRole('button', { name: 'Mount Fuji', exact: true });
    await result.click(); await settle(page);
    await lifecycleEvidence(page, `search-history-${width}-activated`);
    assert.ok(new URL(page.url()).searchParams.has('record'));
    await page.goBack(); await settle(page);
    const returned = await lifecycleEvidence(page, `search-history-${width}-back`);
    assert.equal(returned.searching, 'true');
    assert.equal(await page.getByRole('searchbox', { name: 'Search landmarks', exact: true }).inputValue(), 'Fuji');
    assert.ok(await result.evaluate(element => element === document.activeElement), 'Back returns focus to the activated result');
    assert.ok(Math.abs(returned.scroll! - origin.scroll!) <= 1, 'Search does not reset the retained place scroll');
    await page.goForward(); await settle(page);
    assert.ok(new URL(page.url()).searchParams.has('record'));
    await page.reload(); await settle(page);
    assert.equal(await page.locator('[data-place-header] [data-place-title]').textContent(), 'Mount Fuji');
    await page.getByRole('button', { name: 'Back', exact: true }).click(); await settle(page);
    assert.equal(new URL(page.url()).searchParams.has('record'), false, 'A reloaded detail still has a usable local Back');
  } finally { await f.close(); }
});

test('search crosses docked/overlay capacity without losing input identity, selection or draft', async () => {
  const f = await publicCatalogFixture(); const { page } = f;
  try {
    await page.setViewportSize({ width: 390, height: 900 });
    const input = await search(page); await input.fill('Fuji');
    await page.keyboard.press('Home'); await page.keyboard.press('Shift+ArrowRight');
    const initial = await input.elementHandle();
    const selection = await input.evaluate(element => [(element as HTMLInputElement).selectionStart, (element as HTMLInputElement).selectionEnd]);
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 }); await settle(page);
      await lifecycleEvidence(page, `search-resize-${width}`, { selection });
      assert.equal(await input.inputValue(), 'Fuji');
      assert.ok(await input.evaluate((element, original) => element === original && element === document.activeElement, initial));
      assert.deepEqual(await input.evaluate(element => [(element as HTMLInputElement).selectionStart, (element as HTMLInputElement).selectionEnd]), selection);
    }
    await page.keyboard.press('Escape'); await settle(page);
    assert.equal(await page.locator('[data-catalog-workspace]').getAttribute('data-search-active'), 'false');
  } finally { await f.close(); }
});

test('search still yields to a genuinely external pointer navigation target', async () => {
  const f = await publicCatalogFixture(); const { page } = f;
  try {
    await page.setViewportSize({ width: 1280, height: 900 });
    await (await search(page)).fill('Fuji');
    await page.getByRole('button', { name: 'Travel kit', exact: true }).click(); await settle(page);
    const state = await lifecycleEvidence(page, 'search-external-navigation');
    assert.equal(state.searching, 'false');
    assert.equal(new URL(page.url()).searchParams.get('place'), 'travel-kit');
    assert.ok(await page.getByRole('textbox', { name: 'Trip name', exact: true }).isVisible());
  } finally { await f.close(); }
});

test('keyboard focus leaving search still dismisses it without stealing the new target', async () => {
  const f = await publicCatalogFixture(); const { page } = f;
  try {
    await page.setViewportSize({ width: 1280, height: 900 });
    await (await search(page)).fill('Fuji');
    // Move in actual browser tab order; no programmatic focus setup.
    for (let step = 0; step < 20 && await page.locator('[data-catalog-workspace]').getAttribute('data-search-active') === 'true'; step++) {
      await page.keyboard.press('Shift+Tab'); await settle(page);
    }
    const state = await lifecycleEvidence(page, 'search-external-keyboard');
    assert.equal(state.searching, 'false', 'Leaving the search focus boundary closes it');
    if (state.documentHasFocus) {
      assert.ok(state.active.visible && !state.active.inert && state.active.tag !== 'BODY');
    } else {
      // Native reverse Tab can leave the document for browser chrome. Do not
      // steal that focus back into the app to satisfy an in-page-only model.
      assert.equal(state.active.tag, 'BODY');
    }
    assert.ok(await page.evaluate(() => !document.activeElement?.closest('[data-catalog-search-actions],[data-catalog-search-scroll]')));
  } finally { await f.close(); }
});
