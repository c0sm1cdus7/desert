import test from "node:test";
import assert from "node:assert/strict";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { action, box, navigationAction, settle } from "./public-catalog-expectations.ts";

// Owner expectations recorded before implementation, 2026-10-16:
// navigation disclosure lives below content, never alongside Back; compact
// navigation is an inset, narrow instance of the same transient panel.
test("navigation has a named header and an inset bottom disclosure", async () => {
  const f = await publicCatalogFixture();
  try {
    const { page } = f;
    await page.setViewportSize({ width: 1100, height: 760 });
    await action(page, "Learn More").click(); await settle(page);
    const toggle = action(page, "Hide navigation");
    const panel = page.locator('[data-slot="sidebar-inner"]');
    const t = await box(toggle), p = await box(panel), b = await box(action(page, "Back"));
    assert.ok(t.y > p.y + p.height * .8, "Disclosure belongs in the sidebar footer");
    assert.ok(t.x - p.x >= 8 && p.y + p.height - t.y - t.height >= 8, "Disclosure clears the rounded edges");
    assert.ok(t.y > b.y + b.height, "Disclosure does not compete with Back");
    assert.ok(await page.locator('[data-slot="sidebar-header"]').innerText(), "Header identifies the product");
    await toggle.focus(); await page.keyboard.press("Enter"); await settle(page);
    const show = action(page, "Show navigation"), closed = await box(show);
    assert.ok(closed.y > 760 * .8, "Collapsed disclosure stays below content");
    assert.ok(await show.evaluate(e => e === document.activeElement), "Collapse preserves visible keyboard focus");
    await action(page, "Search").click(); await settle(page);
    assert.equal(await show.isVisible(), false, "Search owns chrome without a competing disclosure");
  } finally { await f.close(); }
});

test("compact navigation and transient surfaces use one floating panel geometry", async () => {
  const f = await publicCatalogFixture();
  try {
    const { page } = f;
    await page.setViewportSize({ width: 600, height: 740 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await action(page, "Show navigation").click(); await settle(page);
    const nav = page.getByRole("dialog", { name: "Navigation", exact: true });
    assert.equal(await page.locator("[data-catalog-navigation-dock]").isVisible(), false,
      "The opener must not peek through the floating panel's lower corner");
    const n = await box(nav);
    const style = await nav.evaluate(e => {
      const s = getComputedStyle(e);
      return { radius: s.borderTopLeftRadius, material: s.backgroundColor, filter: s.backdropFilter };
    });
    assert.ok(n.x >= 8 && n.y >= 8 && n.y + n.height <= 732, "Panel floats clear of every screen edge");
    assert.ok(n.width < 600 * .7, "Navigation remains narrower than a task surface");
    assert.ok(parseFloat(style.radius) >= 24, "Panel has a generous, non-input corner radius");
    const toggle = await box(action(page, "Hide navigation"));
    assert.ok(toggle.width >= 44 && toggle.height >= 44, "Compact ghost keeps a 44px hit target");
    assert.ok(toggle.y > n.y + n.height * .8);
    await page.keyboard.press("Escape"); await nav.waitFor({ state: "hidden" }); await settle(page);
    assert.ok(await action(page, "Show navigation").evaluate(e => e === document.activeElement));
    await (await navigationAction(page, "Component bank")).click(); await settle(page);
    await action(page, "Open transient example").first().click(); await settle(page);
    const transient = page.getByRole("dialog", { name: "Diagnostic transient", exact: true });
    const shared = await transient.evaluate(e => {
      const s = getComputedStyle(e);
      return { radius: s.borderTopLeftRadius, material: s.backgroundColor, filter: s.backdropFilter };
    });
    assert.deepEqual(shared, style, "Navigation and tasks share the panel radius and material");
    assert.ok((await box(transient)).width > n.width);
  } finally { await f.close(); }
});

test("bottom disclosures retain shared hover and pressed feedback", async () => {
  const f = await publicCatalogFixture();
  try {
    const { page } = f;
    await page.setViewportSize({ width: 1100, height: 760 });
    for (const name of ["Hide navigation", "Show navigation"]) {
      const button = action(page, name);
      await page.mouse.move(800, 500); await settle(page);
      const normal = await button.evaluate(e => getComputedStyle(e).backgroundImage);
      await button.hover(); await settle(page);
      const hover = await button.evaluate(e => getComputedStyle(e).backgroundImage);
      assert.notEqual(hover, normal, "The whole ghost button responds to hover");
      await page.mouse.down(); await settle(page);
      const pressed = await button.evaluate(e => getComputedStyle(e).backgroundImage);
      assert.notEqual(pressed, hover, "The whole ghost button responds while held");
      await page.mouse.up(); await settle(page);
    }
  } finally { await f.close(); }
});
