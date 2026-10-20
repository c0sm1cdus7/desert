import test from "node:test";
import assert from "node:assert/strict";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { settle } from "./public-catalog-expectations.ts";

// One mounted identity/search, invariant scroll reservation, no animated-layout
// feedback. Narrow width and larger text are capacities, not device categories.
for (const [width, scale] of [[320, 1], [390, 1], [1280, 1], [320, 2], [1280, 2]] as const) {
  test(`one place toolbar remains stable at ${width}px / ${scale * 100}% text`, async () => {
    const f = await publicCatalogFixture();
    try {
      await f.page.setViewportSize({ width, height: 900 });
      await f.page.goto(`${f.origin}/?place=bank`);
      await f.page.evaluate(value => document.documentElement.style.setProperty("--text-scale", String(value)), scale);
      await settle(f.page);
      const header = f.page.locator('[data-catalog-content] > [data-place-header]');
      assert.equal(await header.count(), 1);
      assert.equal(await f.page.locator('[data-catalog-toolbar-heading]').count(), 0);
      const title = await header.locator('[data-place-title]').elementHandle();
      const search = await f.page.getByRole("searchbox", { name: "Find component", exact: true }).elementHandle();
      await search!.evaluate((node: HTMLInputElement) => { node.focus(); node.setSelectionRange(0, 0); });
      const before = await f.page.locator('[data-catalog-scroll]').evaluate(node => node.scrollHeight);
      for (const y of [30, 60, 90, 180, 420, 90, 30, 0]) {
        await f.page.locator('[data-catalog-scroll]').evaluate((node, y) => node.scrollTop = y, y);
        await settle(f.page);
        const geometry = await f.page.locator('[data-catalog-scroll]').evaluate(async node => {
          const frames = [];
          for (let n = 0; n < 8; n++) {
            await new Promise(requestAnimationFrame);
            frames.push({ top: node.scrollTop, height: node.scrollHeight });
          }
          return frames;
        });
        assert.ok(geometry.every(frame => frame.height === before), "scroll never changes its own reservation");
        assert.ok(geometry.every(frame => Math.abs(frame.top - geometry[0]!.top) < 1), "no self-sustaining scroll oscillation");
        assert.equal(await title!.evaluate(node => node === document.querySelector('[data-catalog-content] > [data-place-header] [data-place-title]')), true);
        assert.equal(await search!.evaluate(node => node === document.activeElement), true, "same focused input survives collapse");
        const bounds = await search!.boundingBox();
        assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width + 1, "search stays inside available space");
      }
    } finally { await f.close(); }
  });
}

test("feature media is one full-frame layer, not a second sidebar background", async () => {
  const f = await publicCatalogFixture();
  try {
    await f.page.setViewportSize({ width: 1280, height: 900 }); await settle(f.page);
    const media = f.page.locator('[data-catalog-content] > [data-place-header] img');
    assert.equal(await media.count(), 1);
    const bounds = await media.boundingBox();
    assert.ok(bounds && Math.abs(bounds.x) < 1 && Math.abs(bounds.width - 1280) < 1);
    assert.equal(await f.page.locator('[data-catalog-scroll] [data-public-hero]').count(), 0);
  } finally { await f.close(); }
});
