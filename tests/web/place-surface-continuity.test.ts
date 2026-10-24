import assert from 'node:assert/strict';
import test from 'node:test';
import { publicCatalogFixture } from './public-catalog-fixture.ts';
import { settle } from './public-catalog-expectations.ts';
import { scrollTo } from './scroll-edge-fixture.ts';

test('floating sidebar reserves readable space, never a second image or cut parent surface', async () => {
  const f = await publicCatalogFixture();
  try {
    const { page } = f;
    await page.setViewportSize({ width: 1280, height: 800 }); await settle(page);
    const place = page.locator('[data-catalog-content]');
    const viewport = place.locator('[data-catalog-scroll]');
    const hero = page.locator('[data-catalog-content] > [data-place-header] [data-place-media]').first();
    assert.equal(await page.locator('[data-catalog-background-extension]').count(), 0);
    for (const node of [place, viewport, hero]) {
      const rect = (await node.boundingBox())!;
      assert.equal(rect.x, 0); assert.equal(rect.width, 1280);
    }
    const pane = (await page.locator('[data-slot="sidebar-container"]').boundingBox())!;
    const content = (await page.locator('[data-catalog-group]').first().boundingBox())!;
    assert.ok(content.x >= pane.x + pane.width, 'readable content avoids the floating pane');
    await scrollTo(viewport, 'middle');
    for (const edge of await place.locator(':scope > [data-scroll-edges] > [data-scroll-edge]').all()) {
      const rect = (await edge.boundingBox())!;
      assert.equal(rect.x, 0); assert.equal(rect.width, 1280);
    }
    await viewport.evaluate(node => node.scrollTo(0, 0)); await settle(page);
    await page.getByRole('button', { name: 'Learn More', exact: true }).click(); await settle(page);
    const media = (await page.locator('[data-catalog-content] > [data-place-header] [data-place-media]').boundingBox())!;
    assert.equal(media.x, 0); assert.equal(media.width, 1280);
    assert.equal(await page.locator('[data-catalog-background-extension]').count(), 0);
  } finally { await f.close(); }
});

test('component bank has one expanded search and no category/count rails', async () => {
  const f = await publicCatalogFixture();
  try {
    const { page } = f;
    await page.goto(`${f.origin}/?place=bank`); await settle(page);
    const input = page.getByRole('searchbox', { name: 'Find component', exact: true });
    // Collection specimens may demonstrate their own search; they are content,
    // not a second search for the containing place.
    assert.equal(await page.getByRole('searchbox').evaluateAll(nodes =>
      nodes.filter(node => !node.closest('[data-view-item^="entry:"]')).length), 1);
    assert.equal(await page.getByRole('button', { name: 'Search', exact: true }).count(), 0);
    assert.equal(await page.locator('#catalog-navigation a, #catalog-navigation [role="status"]').count(), 0);
    const handle = await input.elementHandle();
    await input.fill('Money'); await settle(page);
    assert.equal(await page.locator('[data-view-item="entry:control.money"]').isVisible(), true);
    await scrollTo(page.locator('[data-catalog-scroll]'), 'middle');
    assert.ok(await input.evaluate((node, previous) => node === previous, handle));
    assert.equal(await input.inputValue(), 'Money');
  } finally { await f.close(); }
});
