import test from 'node:test';
import assert from 'node:assert/strict';
import { publicCatalogFixture } from './public-catalog-fixture.ts';
import { navigationAction, settle } from './public-catalog-expectations.ts';
import { saveFixedEvidence } from './fixed-toolbar-expectations.ts';

for (const width of [390, 1280]) test(`transient with no task footer has only its top Close at ${width}px`, async () => {
  const f = await publicCatalogFixture(); const { page } = f;
  try {
    await page.setViewportSize({ width, height: 900 });
    await (await navigationAction(page, 'Component bank')).click(); await settle(page);
    const opener = page.getByRole('button', { name: 'Open transient example', exact: true }).first();
    await opener.click(); await settle(page);
    const dialog = page.getByRole('dialog', { name: 'Diagnostic transient', exact: true });
    const state = { closeCount: await dialog.getByRole('button', { name: 'Close', exact: true }).count(),
      footerCount: await dialog.locator('[data-surface-slot="bottom"]').count(),
      topClose: await dialog.locator('[data-surface-slot="top"]').getByRole('button', { name: 'Close', exact: true }).count() };
    await saveFixedEvidence(page, `single-dismissal-${width}`, state);
    // Exercise both dismissal paths even on the red baseline, so duplication is
    // not confused with a broken Escape handler or lost opener.
    await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
    assert.ok(await opener.evaluate(element => element === document.activeElement));
    await opener.click(); await settle(page);
    await dialog.locator('[data-surface-slot="top"]').getByRole('button', { name: 'Close', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    assert.ok(await opener.evaluate(element => element === document.activeElement));
    assert.deepEqual(state, { closeCount: 1, footerCount: 0, topClose: 1 });
  } finally { await f.close(); }
});
