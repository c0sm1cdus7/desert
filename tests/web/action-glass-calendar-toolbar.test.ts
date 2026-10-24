import assert from 'node:assert/strict';
import test from 'node:test';
import { publicCatalogFixture } from './public-catalog-fixture.ts';
import { navigationAction, settle } from './public-catalog-expectations.ts';

for (const width of [390, 1280]) test(`compiled glass actions and calendar toolbar at ${width}px`, async () => {
  const f = await publicCatalogFixture();
  try {
    await f.page.setViewportSize({ width, height: 900 });
    await f.page.getByRole('button', { name: 'Learn More', exact: true }).click();
    const back = f.page.getByRole('button', { name: 'Back', exact: true });
    assert.match(await back.evaluate(el => getComputedStyle(el).backdropFilter), /blur\(/);
    await settle(f.page);
    await f.page.screenshot({ path: `artifacts/action-glass-calendar-toolbar/compiled-hero-${width}.png` });
    await (await navigationAction(f.page, 'Travel kit')).click();
    const trigger = f.page.locator('[data-field-trigger]');
    await trigger.click();
    const dialog = f.page.getByRole('dialog', { name: 'Arrival date', exact: true });
    const toolbar = dialog.locator('[data-piece="toolbar"]');
    await toolbar.waitFor();
    assert.equal(await toolbar.count(), 1);
    const title = toolbar.locator('h2');
    const first = await title.textContent();
    await toolbar.getByRole('button', { name: 'Next month', exact: true }).click();
    assert.notEqual(await title.textContent(), first);
    await toolbar.getByRole('button', { name: 'Previous month', exact: true }).click();
    assert.equal(await title.textContent(), first);
    await settle(f.page);
    await f.page.screenshot({ path: `artifacts/action-glass-calendar-toolbar/compiled-calendar-${width}.png` });
    const day = dialog.locator('[data-calendar-day]:not([data-disabled]):not([data-outside-month])').first();
    await day.focus(); await f.page.keyboard.press('Enter');
    await dialog.waitFor({ state: 'hidden' });
    assert.doesNotMatch(await trigger.innerText(), /No date selected/);
    assert.ok(await trigger.evaluate(el => el === document.activeElement));
  } finally { await f.close(); }
});
