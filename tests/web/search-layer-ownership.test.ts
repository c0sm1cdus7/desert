import assert from "node:assert/strict";
import test from "node:test";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { settle } from "./public-catalog-expectations.ts";
import { edgeState, paint, saveEdgeEvidence, scrollTo } from "./scroll-edge-fixture.ts";
import { assertOpaqueForeground, setSearchPreferences } from "./public-search-mode-helpers.ts";

// The foreground may own input, but never the retained place's scroll effects.
// Empty search has no overflow; it must not erase the background's active edges.
for (const width of [390, 1280]) test(`search composes above retained page edges at ${width}px`, async () => {
  const f = await publicCatalogFixture();
  try {
    const { page } = f;
    await page.setViewportSize({ width, height: 740 });
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    const owner = page.locator('[data-catalog-content]');
    const viewport = owner.locator('[data-catalog-scroll]');
    await scrollTo(viewport, 'middle');
    const position = await viewport.evaluate(node => node.scrollTop);
    const previous = await edgeState(owner);
    assert.ok(previous.some(edge => edge.active === 'true'));
    const handles = await owner.locator(':scope > [data-scroll-edges] > [data-scroll-edge]').elementHandles();
    const navigation = owner.locator('[data-toolbar-leading]');
    const navigationBefore = await navigation.evaluate(node => ({ html: node.innerHTML,
      rect: node.getBoundingClientRect().toJSON(), display: getComputedStyle(node).display }));
    await saveEdgeEvidence(page, `search-${width}-before`, owner);
    await owner.getByRole('button', { name: 'Search', exact: true }).click();
    await settle(page);
    const input = owner.getByRole('searchbox');
    for (const query of ['', 'mount', 'no-results-91823']) {
      await input.fill(query); await settle(page); await paint(page);
      assert.equal(await viewport.evaluate(node => node.scrollTop), position);
      assert.deepEqual(await edgeState(owner), previous,
        'opening search and changing its results do not modify the retained edge layers');
      assert.deepEqual(await navigation.evaluate(node => ({ html: node.innerHTML,
        rect: node.getBoundingClientRect().toJSON(), display: getComputedStyle(node).display })), navigationBefore,
        'foreground search does not hide, remove or reposition underlying navigation');
      for (const handle of handles) assert.ok(await handle.evaluate(node => node.isConnected),
        'the lower edge instance is retained, not replaced');
    }
    await saveEdgeEvidence(page, `search-${width}-overlay`, owner);
    await setSearchPreferences(page, true); await settle(page);
    await assertOpaqueForeground(page);
    await setSearchPreferences(page, false); await settle(page);
    await page.keyboard.press('Escape'); await settle(page);
    assert.deepEqual(await edgeState(owner), previous);
    assert.equal(await viewport.evaluate(node => node.scrollTop), position);
  } finally { await f.close(); }
});
