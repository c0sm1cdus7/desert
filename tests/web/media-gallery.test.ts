import test from 'node:test';
import assert from 'node:assert/strict';
import { publicCatalogFixture } from './public-catalog-fixture.ts';

test('header gallery uses compact dots, silent loading and the shared zoomable viewer', async () => {
  const f = await publicCatalogFixture();
  try {
    const { page } = f;
    await page.locator('[data-photo-collection] [data-image-state="ready"]').first().waitFor();
    const dots = page.locator('[data-media-dots] button');
    assert.equal(await dots.count(), 3);
    const a = await dots.nth(0).boundingBox(), b = await dots.nth(1).boundingBox();
    assert.equal(b!.x - a!.x, 24);
    const opener = page.locator('[data-media-open]').first();
    await opener.click();
    const viewer = page.locator('[data-media-viewer]');
    await viewer.waitFor();
    await viewer.getByRole('button', { name: 'Zoom in', exact: true }).click();
    assert.match(await viewer.locator('[data-media-zoom]').innerText(), /200%/);
    await viewer.getByRole('button', { name: 'Reset zoom', exact: true }).click();
    await viewer.getByRole('button', { name: 'Next media', exact: true }).click();
    assert.equal(await viewer.locator('[data-toolbar-subtitle]').innerText(), '2 / 3');
    await page.keyboard.press('Escape');
    await viewer.waitFor({ state: 'hidden' });
    assert.equal(await dots.nth(1).getAttribute('aria-current'), 'true');
    assert.equal(await opener.evaluate(el => el === document.activeElement), true);
    assert.equal(await opener.evaluate(el => getComputedStyle(el).outlineStyle), 'none');
    assert.equal(await page.getByText('Loading image', { exact: true }).count(), 0);
  } finally { await f.close(); }
});
