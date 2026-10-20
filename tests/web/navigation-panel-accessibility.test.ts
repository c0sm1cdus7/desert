import test from "node:test";
import assert from "node:assert/strict";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { action, box, navigationAction, settle } from "./public-catalog-expectations.ts";

test("floating navigation remains usable at 320px, enlarged text and system material preferences", async () => {
  const f = await publicCatalogFixture();
  try {
    const { page, context } = f;
    await page.setViewportSize({ width: 320, height: 568 });
    await page.evaluate(() => document.documentElement.style.fontSize = "200%");
    const cdp = await context.newCDPSession(page);
    for (const scheme of ["light", "dark"]) for (const reduced of [false, true]) {
      await cdp.send("Emulation.setEmulatedMedia", { features: [
        { name: "prefers-color-scheme", value: scheme },
        { name: "prefers-reduced-motion", value: "reduce" },
        { name: "prefers-reduced-transparency", value: reduced ? "reduce" : "no-preference" },
      ] });
      await action(page, "Show navigation").click(); await settle(page);
      const nav = page.getByRole("dialog", { name: "Navigation", exact: true });
      const panel = await box(nav), toggle = await box(action(page, "Hide navigation"));
      assert.ok(panel.x >= 8 && panel.x + panel.width <= 312);
      assert.ok(toggle.y + toggle.height <= panel.y + panel.height - 8);
      assert.ok(toggle.width >= 44 && toggle.height >= 44);
      const paint = await nav.evaluate(e => ({
        filter: getComputedStyle(e).backdropFilter,
        animation: getComputedStyle(e).animationName,
        overflow: e.scrollWidth > e.clientWidth,
      }));
      assert.equal(paint.overflow, false);
      assert.equal(paint.animation, "none");
      if (reduced) assert.equal(paint.filter, "none");
      else assert.match(paint.filter, /blur/);
      await action(page, "Hide navigation").click(); await settle(page);
      assert.ok(await action(page, "Show navigation").evaluate(e => e === document.activeElement));
    }
  } finally { await f.close(); }
});

// A floating bottom control must leave room for the last content row to scroll
// above it, not merely fit inside the screen itself.
test("collapsed desktop navigation reserves reading space above its bottom dock", async () => {
  const f = await publicCatalogFixture();
  try {
    const { page } = f;
    await page.setViewportSize({ width: 1100, height: 760 });
    await (await navigationAction(page, "Travel kit")).click(); await settle(page);
    await action(page, "Hide navigation").click(); await settle(page);
    const dock = await box(action(page, "Show navigation"));
    const bottom = await page.locator("[data-catalog-scroll]").evaluate(e => ({
      edge: e.getBoundingClientRect().bottom,
      padding: parseFloat(getComputedStyle(e).paddingBottom),
    }));
    assert.ok(bottom.padding >= bottom.edge - dock.y + 8,
      "The last content row can scroll fully above the floating toggle");
  } finally { await f.close(); }
});
