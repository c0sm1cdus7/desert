import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { publicCatalogFixture } from './public-catalog-fixture.ts';

for (const width of [390, 1280]) {
  test(`gallery close precedes identity visually and in DOM at ${width}px`, async () => {
    const f = await publicCatalogFixture();
    try {
      const { page } = f;
      await page.setViewportSize({ width, height: 820 });
      await page.goto(`${f.origin}/?record=1014`);
      const opener = page.locator('[data-media-open]').first();
      await opener.click();
      const viewer = page.locator('[data-media-viewer]');
      const close = viewer.getByRole('button', { name: 'Close photo viewer', exact: true });
      await close.waitFor();
      assert.equal(await close.evaluate(el => el.parentElement?.firstElementChild === el), true);
      assert.equal(await close.evaluate(el => el === document.activeElement), true);
      const button = await close.boundingBox();
      const identity = await viewer.locator('[data-media-identity]').boundingBox();
      assert.ok(button && identity);
      assert.ok(identity.x >= button.x + button.width, 'identity follows close without overlap');
      assert.ok(Math.abs(identity.y + identity.height / 2 - button.y - button.height / 2) < 1);
      await page.keyboard.press('Tab');
      assert.equal(await viewer.getByRole('button', { name: 'Reset zoom', exact: true })
        .evaluate(el => el === document.activeElement), true);
      if (process.env.DESERT_MEDIA_TOOLBAR_CAPTURES) {
        await viewer.locator('[data-image-state="ready"]').first().waitFor();
        await mkdir(process.env.DESERT_MEDIA_TOOLBAR_CAPTURES, { recursive: true });
        await page.screenshot({ path: `${process.env.DESERT_MEDIA_TOOLBAR_CAPTURES}/${width}.png` });
      }
      await close.click();
      await viewer.waitFor({ state: 'hidden' });
      assert.equal(await opener.evaluate(el => el === document.activeElement), true);
    } finally { await f.close(); }
  });
}
