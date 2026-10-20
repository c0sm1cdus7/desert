import assert from 'node:assert/strict';
import test from 'node:test';
import { publicCatalogFixture } from './public-catalog-fixture.ts';
import { settle } from './public-catalog-expectations.ts';

for (const width of [390, 1280]) for (const reducedMotion of ['reduce', 'no-preference'] as const) {
  test(`real wheel stops at an unambiguous identity with focused input: ${width}/${reducedMotion}`, async () => {
    const f = await publicCatalogFixture(); const { page } = f;
    try {
      await page.setViewportSize({ width, height: 800 }); await page.emulateMedia({ reducedMotion });
      await page.goto(`${f.origin}/?place=travel-kit`); await settle(page);
      const viewport = page.locator('[data-catalog-scroll]');
      const header = page.locator('[data-place-header]');
      await page.waitForFunction(() => Number(document.querySelector<HTMLElement>('[data-place-header]')?.dataset.handoffEnd) > 1);
      const end = Number(await header.getAttribute('data-handoff-end'));
      const start = Number(await header.getAttribute('data-handoff-start'));
      const input = page.getByRole('textbox', { name: 'Trip name', exact: false });
      await input.fill('Keep this draft');
      await viewport.evaluate(el => el.scrollTop = 0); await settle(page);
      const bounds = (await viewport.boundingBox())!;
      await page.mouse.move(bounds.x + bounds.width - 25, bounds.y + 240);
      // Browser wheel + native scrollend/debounce; no synthetic scrollend to rescue it.
      await page.mouse.wheel(0, start + (end - start) * .7);
      await page.waitForFunction(() => document.querySelector<HTMLElement>('[data-place-header]')?.dataset.handoff === 'compact');
      await page.waitForTimeout(350);
      assert.equal(await header.getAttribute('data-handoff'), 'compact');
      assert.equal(await page.locator('.place-heading-copy').evaluate(el => getComputedStyle(el).opacity), '0');
      await page.mouse.wheel(0, -(end - start) * .7);
      await page.waitForFunction(() => document.querySelector<HTMLElement>('[data-place-header]')?.dataset.handoff === 'expanded');
      assert.equal(await page.locator('[data-toolbar-identity]').evaluate(el => getComputedStyle(el).opacity), '0');
      assert.equal(await input.inputValue(), 'Keep this draft');
      assert.equal(await input.evaluate(el => el === document.activeElement), true);
    } finally { await f.close(); }
  });
}

test('media scroll is free until the identity reaches the upper rail', async () => {
  const f = await publicCatalogFixture(); const { page } = f;
  try {
    await page.setViewportSize({ width: 1280, height: 900 }); await settle(page);
    const header = page.locator('[data-place-header]');
    const start = Number(await header.getAttribute('data-handoff-start'));
    assert.ok(start > 200, 'Media must not start snapping as soon as the page scrolls');
    await page.mouse.move(1100, 320); await page.mouse.wheel(0, 100); await page.waitForTimeout(600);
    assert.equal(await page.locator('[data-catalog-scroll]').evaluate(el => el.scrollTop), 100);
    assert.equal(await header.getAttribute('data-handoff'), 'expanded');
    const copy = await page.locator('[data-dock-above]').boundingBox();
    const box = await header.boundingBox();
    assert.ok(Math.abs(box!.y + box!.height - copy!.y - copy!.height - 32) < 2, 'Identity is docked to media bottom');
  } finally { await f.close(); }
});

test('handoff never paints two identities and settles after keyboard scrolling', async () => {
  const f = await publicCatalogFixture(); const { page } = f;
  try {
    await page.goto(`${f.origin}/?place=travel-kit`); await settle(page);
    const viewport = page.locator('[data-catalog-scroll]');
    const header = page.locator('[data-place-header]');
    const start = Number(await header.getAttribute('data-handoff-start'));
    const end = Number(await header.getAttribute('data-handoff-end'));
    for (const progress of [.1, .3, .5, .7, .9]) {
      await viewport.evaluate((el, y) => el.scrollTop = y, start + (end - start) * progress);
      await settle(page);
      const visible = await page.evaluate(() => ['[data-dock-above]', '[data-toolbar-identity]']
        .map(selector => Number(getComputedStyle(document.querySelector(selector)!).opacity)));
      assert.ok(visible[0] === 0 || visible[1] === 0, 'No overlapping title/subtitle copies');
    }
    await viewport.evaluate((el, y) => { el.tabIndex = -1; el.focus(); el.scrollTop = y; }, start + 1);
    await page.keyboard.press('ArrowDown');
    await page.waitForFunction(() => document.querySelector<HTMLElement>('[data-place-header]')?.dataset.handoff !== 'transition');
    await page.waitForTimeout(350);
    assert.notEqual(await header.getAttribute('data-handoff'), 'transition');
  } finally { await f.close(); }
});

for (const width of [390, 1280]) test(`header and section text share one content axis at ${width}`, async () => {
  const f = await publicCatalogFixture(); const { page } = f;
  try {
    await page.setViewportSize({ width, height: 900 }); await settle(page);
    const copy = (await page.locator('[data-dock-above]').boundingBox())!;
    const section = (await page.locator('[data-catalog-group-title]').first().boundingBox())!;
    const card = (await page.locator('[data-catalog-card]').first().boundingBox())!;
    assert.ok(Math.abs(copy.x - section.x) < 1, 'Header and section title align');
    assert.ok(Math.abs(section.x - card.x - 16) < 1, 'Surface extends one content inset past text');
    if (width === 1280) {
      const end = Number(await page.locator('[data-place-header]').getAttribute('data-handoff-end'));
      await page.locator('[data-catalog-scroll]').evaluate((el, y) => el.scrollTop = y, end + 1);
      await settle(page);
      const compact = (await page.locator('[data-identity-title]').boundingBox())!;
      assert.ok(Math.abs(compact.x - section.x) < 1, 'Docked identity preserves the content axis');
    }
  } finally { await f.close(); }
});
