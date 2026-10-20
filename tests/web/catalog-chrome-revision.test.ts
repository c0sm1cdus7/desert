import test from "node:test";
import assert from "node:assert/strict";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { action, box, settle } from "./public-catalog-expectations.ts";

// Owner's 2026-10-16 corrections, recorded before implementation:
// rich imagery continues behind the floating sidebar's outer inset; disclosure
// is top-trailing with settings bottom-trailing; navigation is separate from developer tools;
// compact Back is top-leading while search stays at the bottom.
test("hero extends through the sidebar inset; navigation has grouped, colored identities", async () => {
  const f = await publicCatalogFixture();
  try {
    await f.page.setViewportSize({ width: 1200, height: 800 }); await settle(f.page);
    const coverage = await f.page.locator("[data-catalog-content] > [data-place-header] [data-place-media]").first().evaluate(element => {
      const style = getComputedStyle(element), r = element.getBoundingClientRect();
      return { top: r.top, left: r.left, clip: style.clipPath };
    });
    assert.equal(coverage.top, 0); assert.equal(coverage.left, 0);
    assert.equal(coverage.clip, "none", "Do not clip imagery at the rounded sidebar silhouette");
    assert.equal(await f.page.locator('[data-catalog-navigation] [data-slot="sidebar-group"]').count(), 2);
    const colors = await f.page.locator("[data-navigation-icon]").evaluateAll(elements =>
      elements.map(e => getComputedStyle(e).backgroundColor));
    assert.equal(new Set(colors).size, 3, "Destination identity is not three identical monochrome glyphs");
  } finally { await f.close(); }
});

test("sidebar toggle and settings share aligned top/bottom toolbars", async () => {
  const f = await publicCatalogFixture();
  try {
    for (const width of [1200, 390]) {
      await f.page.setViewportSize({ width, height: 844 }); await settle(f.page);
      if (width === 390) await action(f.page, "Show navigation").click();
      await settle(f.page);
      const panel = await box(f.page.locator(width === 390 ? '[data-sidebar="sidebar"][data-presentation="overlay"]' : '[data-slot="sidebar-inner"]'));
      const toggle = await box(action(f.page, "Hide navigation"));
      assert.ok(toggle.x > panel.x + panel.width / 2, "Toggle belongs on the right of the sidebar title");
      assert.ok(panel.x + panel.width - toggle.x - toggle.width >= 8);
      assert.ok(toggle.y < panel.y + 70);
      const settings = await box(action(f.page, "Settings"));
      assert.ok(settings.y > panel.y + panel.height * .8);
      assert.ok(Math.abs(settings.x + settings.width - toggle.x - toggle.width) < 2);
    }
  } finally { await f.close(); }
});

test("compact Back remains top-leading while Search remains below", async () => {
  const f = await publicCatalogFixture();
  try {
    await f.page.setViewportSize({ width: 390, height: 844 });
    await action(f.page, "Learn More").click(); await settle(f.page);
    const back = await box(action(f.page, "Back")), search = await box(action(f.page, "Search"));
    assert.ok(back.x < 70 && back.y < 70, "Back must not share the bottom action bar");
    assert.ok(back.width >= 44 && back.height >= 44);
    assert.ok(search.y > 740, "Search stays in thumb reach");
    await action(f.page, "Search").click(); await settle(f.page);
    assert.equal(await action(f.page, "Back").count(), 0, "Search excludes retained navigation from accessibility ownership");
    assert.equal(await f.page.locator('[data-catalog-content] > [data-place-header]').evaluate(node => node.hasAttribute('inert')), true);
  } finally { await f.close(); }
});

test("edge gestures do not intercept visible navigation button targets", async () => {
  const f = await publicCatalogFixture();
  try {
    await f.page.setViewportSize({ width: 390, height: 844 }); await settle(f.page);
    const disclosure = action(f.page, "Show navigation");
    await disclosure.click({ position: { x: 2, y: 22 } });
    await action(f.page, "Hide navigation").click(); await settle(f.page);
    await action(f.page, "Learn More").click(); await settle(f.page);
    await action(f.page, "Back").click({ position: { x: 2, y: 22 } });
    await action(f.page, "Learn More").waitFor();
  } finally { await f.close(); }
});
