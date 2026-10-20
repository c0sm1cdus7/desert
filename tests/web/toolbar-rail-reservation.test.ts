import test from 'node:test';
import assert from 'node:assert/strict';
import { publicCatalogFixture } from './public-catalog-fixture.ts';
import { near, settle } from './public-catalog-expectations.ts';

for (const width of [320, 390]) test(`bottom search cannot displace the hero identity at ${width}px`, async () => {
  const f = await publicCatalogFixture();
  try {
    await f.page.setViewportSize({ width, height: 900 });
    await settle(f.page);
    const header = f.page.locator('[data-catalog-content] > [data-place-header]');
    assert.equal(await f.page.locator('[data-catalog-toolbar]').getAttribute('data-toolbar'), 'bottom');
    for (const selector of ['[data-place-title]', '[data-toolbar-primary]']) {
      const box = (await header.locator(selector).boundingBox())!;
      near(box.x + box.width / 2, width / 2, 'Expanded hero shares the available place center', 1);
    }
    const eyebrow = await header.locator('[data-toolbar-summary="eyebrow"] p').evaluate(element => {
      const range = document.createRange(); range.selectNodeContents(element);
      return new Set([...range.getClientRects()].map(rect => Math.round(rect.top))).size;
    });
    assert.equal(eyebrow, 1, 'The short eyebrow is not narrowed by an absent top action');
  } finally { await f.close(); }
});
