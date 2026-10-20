import test from 'node:test';
import assert from 'node:assert/strict';
import { publicCatalogFixture } from './public-catalog-fixture.ts';
import { settle } from './public-catalog-expectations.ts';

// Compact identity is a reading layer. High-contrast text passing below must
// not create a second ghost heading; its existing feather remains outside it.
for (const colorScheme of ['dark', 'light'] as const) test(`Compact toolbar has a quiet reading core: ${colorScheme}`, async () => {
  const f = await publicCatalogFixture();
  try {
    const { page } = f;
    await page.setViewportSize({ width: 844, height: 390 });
    await page.emulateMedia({ colorScheme });
    await page.goto(`${f.origin}/?place=bank`); await settle(page);
    const header = page.locator('[data-place-header]');
    assert.equal(await header.evaluate(e => getComputedStyle(e, '::before').opacity), '0');
    await page.locator('[data-catalog-scroll]').evaluate(e => e.scrollTop = 1200);
    await settle(page);
    assert.equal(await header.evaluate(e => getComputedStyle(e, '::before').opacity), '1');
    await page.locator('[data-catalog-scroll]').evaluate(e => {
      const probe = document.createElement('div'); probe.dataset.readingProbe = '';
      Object.assign(probe.style, { position: 'fixed', inset: '0', pointerEvents: 'none' });
      e.append(probe);
    });
    const colors: number[][] = [];
    for (const background of ['white', 'black']) {
      await page.locator('[data-reading-probe]').evaluate((e, color) => e.style.background = color, background);
      const shot = await page.screenshot();
      colors.push(await page.evaluate(async encoded => {
        const image = new Image(); image.src = `data:image/png;base64,${encoded}`; await image.decode();
        const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
        const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0);
        const density = image.width / innerWidth;
        return [...context.getImageData((innerWidth - 20) * density, 8 * density, 1, 1).data].slice(0, 3);
      }, shot.toString('base64')));
    }
    assert.ok(colors[0]!.every((v, i) => Math.abs(v - colors[1]![i]!) <= 1),
      `Underlay must not transmit through compact reading core: ${JSON.stringify(colors)}`);
  } finally { await f.close(); }
});
