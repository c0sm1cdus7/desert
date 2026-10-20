import assert from "node:assert/strict";
import test from "node:test";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { evidence, selectionTrigger, settle } from "./public-catalog-expectations.ts";
import { basename } from "node:path";
import { setSearchPreferences } from "./public-search-mode-helpers.ts";
import { navigationPixelContrast, sidebarPaintInfluence } from "./sidebar-material-probe.ts";

// Only the pane blurs. The original media spans behind it and its outer inset;
// there is no separately loaded image or ribbon altering the sharp page.
test("sidebar samples its current image without painting a separate gutter or altering the sharp page", async () => {
  const app = await publicCatalogFixture();
  try {
    const { page } = app;
    await page.setViewportSize({ width: 1280, height: 900 });
    await setSearchPreferences(page, false); await settle(page);
    const influence = await sidebarPaintInfluence(page);
    await evidence(page, `sidebar-containment-${basename(process.env.DESERT_CATALOG_BUILD ?? "default")}`, influence);
    assert.ok(influence.find(region => region.name === "pane")!.changedPixels > 0,
      "The pane must visibly sample its current image; an isolated backdrop or opaque fill is not glass");
    for (const region of influence.filter(region => region.name !== "pane")) {
      assert.equal(region.changedPixels, 0, `${region.name}: sidebar image decoration must remain inside the actual glass pane`);
    }
  } finally { await app.close(); }
});

test("sidebar material follows the visible record and honors transparency preferences", async () => {
  const app = await publicCatalogFixture();
  try {
    const { page, context } = app;
    await page.setViewportSize({ width: 1280, height: 900 });
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setEmulatedMedia", { features: [
      { name: "prefers-reduced-transparency", value: "no-preference" },
    ] });
    await page.getByRole("button", { name: "South Shetland Islands", exact: true }).click();
    const image = page.locator("[data-catalog-detail-image] img");
    const extension = page.locator("[data-catalog-background-extension]");
    assert.equal(await extension.count(), 0);
    const bounds = (await image.boundingBox())!;
    assert.equal(bounds.x, 0); assert.equal(bounds.width, 1280);
    const material = await page.locator('[data-slot="sidebar-inner"]').evaluate(element => {
      const css = getComputedStyle(element);
      return { mask: css.maskImage, filter: css.backdropFilter, pointer: css.pointerEvents,
        display: css.display, reducedTransparency: matchMedia("(prefers-reduced-transparency: reduce)").matches,
        increasedContrast: matchMedia("(prefers-contrast: more)").matches };
    });
    await evidence(page, `sidebar-material-${basename(process.env.DESERT_CATALOG_BUILD ?? "default")}`, material);
    assert.match(material.filter, /blur/, JSON.stringify(material));
    assert.match(await page.locator('[data-slot="sidebar-inner"]').evaluate(element => getComputedStyle(element).backdropFilter), /blur/);
    await cdp.send("Emulation.setEmulatedMedia", { features: [
      { name: "prefers-reduced-transparency", value: "reduce" },
    ] });
    assert.equal(await extension.isVisible(), false);
    assert.ok(await image.isVisible(), 'Material preferences never remove the underlying place media');
    assert.equal(await page.locator('[data-slot="sidebar-inner"]').evaluate(element => getComputedStyle(element).backdropFilter), "none");
    await page.getByRole("button", { name: "Travel kit", exact: true }).click();
    assert.equal(await extension.count(), 0, "forms must not retain unrelated photographic decoration");
    await cdp.send("Emulation.setEmulatedMedia", { features: [
      { name: "prefers-reduced-transparency", value: "no-preference" },
    ] });
    await selectionTrigger(page, "Destination").click();
    const popup = page.getByRole("listbox");
    await popup.waitFor();
    assert.match(await popup.evaluate(element => getComputedStyle(element).backdropFilter), /blur/,
      "the shared floating material must also survive CSS compilation");
    await cdp.send("Emulation.setEmulatedMedia", { features: [
      { name: "prefers-reduced-transparency", value: "no-preference" },
      { name: "prefers-contrast", value: "more" },
    ] });
    assert.equal(await popup.evaluate(element => getComputedStyle(element).backdropFilter), "none");
  } finally { await app.close(); }
});

test("desktop and compact navigation retain composited text contrast across material preferences", async () => {
  const app = await publicCatalogFixture();
  try {
    const { page, context } = app;
    const cdp = await context.newCDPSession(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await setSearchPreferences(page, false);
    await page.getByRole("button", { name: "South Shetland Islands", exact: true }).click();
    const observations = [];
    for (const compact of [false, true]) {
      if (compact) {
        await page.setViewportSize({ width: 402, height: 874 });
        await page.getByRole("button", { name: "Show navigation", exact: true }).click();
      }
      const pane = compact ? page.getByRole("dialog", { name: "Navigation", exact: true }) : page.locator('[data-slot="sidebar-inner"]');
      await pane.waitFor(); await settle(page);
      for (const preference of ["normal", "reduced", "contrast"]) {
        await cdp.send("Emulation.setEmulatedMedia", { features: [
          { name: "prefers-reduced-transparency", value: preference === "reduced" ? "reduce" : "no-preference" },
          { name: "prefers-contrast", value: preference === "contrast" ? "more" : "no-preference" },
        ] });
        const contrast = await navigationPixelContrast(page, pane);
        observations.push({ compact, preference, contrast });
        await evidence(page, `sidebar-contrast-${compact ? "compact" : "desktop"}-${preference}-${basename(process.env.DESERT_CATALOG_BUILD ?? "default")}`, observations);
        assert.equal(contrast.length, 3);
        for (const row of contrast) assert.ok(row.minimumContrast >= 4.5,
          `${compact ? "Compact" : "Desktop"} ${preference} ${row.name}: ${row.minimumContrast}:1 requires4.5:1`);
        const filter = await pane.evaluate(element => getComputedStyle(element).backdropFilter);
        if (preference === "normal") assert.match(filter, /blur/);
        else assert.equal(filter, "none");
      }
    }
  } finally { await app.close(); }
});

test("compact navigation dims rather than blurs the exposed page outside its glass pane", async () => {
  const app = await publicCatalogFixture();
  try {
    const { page } = app;
    await page.setViewportSize({ width: 402, height: 874 }); await setSearchPreferences(page, false);
    await page.getByRole("button", { name: "Show navigation", exact: true }).click(); await settle(page);
    const overlay = page.locator('[data-slot="dialog-overlay"]');
    const effects = await overlay.evaluate(element => {
      const style = getComputedStyle(element); return { filter: style.filter, backdrop: style.backdropFilter };
    });
    await evidence(page, `sidebar-exposed-page-${basename(process.env.DESERT_CATALOG_BUILD ?? "default")}`, effects);
    assert.equal(effects.filter, "none"); assert.equal(effects.backdrop, "none");
  } finally { await app.close(); }
});
