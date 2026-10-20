import test from "node:test";
import assert from "node:assert/strict";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { action, box, card, evidence, nativeHome, near, readOnlyRequests, resolvedFonts, settle, textStyle } from "./public-catalog-expectations.ts";
import { observeDiagnostics } from "./public-catalog-diagnostics.ts";

async function buttonGeometry(locator: ReturnType<typeof action>) {
  return locator.evaluate(element => {
    const rect = element.getBoundingClientRect(), css = getComputedStyle(element);
    return { width: rect.width, height: rect.height, radius: parseFloat(css.borderRadius), borderWidth: css.borderWidth };
  });
}

test("native-calibrated 900×450 DPR2 home preserves card geometry and Mac text scale", async () => {
  const fixture = await publicCatalogFixture();
  const context = await fixture.browser.newContext({ viewport: nativeHome.viewport,
    deviceScaleFactor: nativeHome.deviceScaleFactor, colorScheme: "dark", reducedMotion: "reduce" });
  try {
    const page = await context.newPage();
    const diagnostics = observeDiagnostics(page), readonly = readOnlyRequests(page);
    await page.goto(fixture.origin);
    await card(page, "Mount Fuji").waitFor();
    await settle(page);
    const first = await box(card(page, "Mount Fuji")), second = await box(card(page, "Wulingyuan"));
    const title = await textStyle(page.getByRole("heading", { name: "Mount Fuji", exact: true }));
    const section = await textStyle(page.getByRole("heading", { name: "Asia", exact: true }));
    const label = await textStyle(card(page, "Mount Fuji").locator("[data-public-card-title]"));
    const radius = await card(page, "Mount Fuji").evaluate(element => {
      const clippingCard = element.closest("[data-public-card]");
      if (!clippingCard) throw new Error("Visible card clipping container missing");
      return parseFloat(getComputedStyle(clippingCard).borderRadius);
    });
    const cta = await buttonGeometry(action(page, "Learn More"));
    assert.ok(cta.radius >= Math.min(cta.width, cta.height) / 2, "The user's new button rule requires capsule CTA corners");
    await evidence(page, "home-native-900x450-dpr2", { viewport: nativeHome.viewport, deviceScaleFactor: 2,
      first, second, title, section, label, radius, cta, resolvedFonts: await resolvedFonts(page), expected: nativeHome, diagnostics: diagnostics.snapshot(),
      note: "Numeric checks are not visual approval; Travel kit/Component bank differ from native navigation and remain unmasked. CTA capsule shape is an explicit new user delta from the native screenshot, not a rewritten native expectation." });
    near(first.width, nativeHome.card.width, "card width");
    near(first.height, nativeHome.card.height, "card height");
    near(second.x - first.x - first.width, nativeHome.card.gap, "rail gap");
    near(radius, nativeHome.card.radius, "card corner radius");
    for (const [name, measured, expected] of [["hero", title, nativeHome.heroTitle],
      ["section", section, nativeHome.sectionTitle], ["card", label, nativeHome.cardTitle]] as const) {
      near(measured.size, expected.size, `${name} font size`, .1);
      near(measured.line, expected.line, `${name} line height`, .1);
      assert.equal(measured.weight, expected.weight, `${name} font weight`);
    }
    readonly(); diagnostics.assertClean();
  } finally { await context.close(); await fixture.close(); }
});

test("402px touch home has reachable 44px targets without page overflow", async () => {
  const fixture = await publicCatalogFixture();
  const context = await fixture.browser.newContext({ viewport: { width: 402, height: 874 },
    deviceScaleFactor: 3, isMobile: true, hasTouch: true, colorScheme: "dark", reducedMotion: "reduce" });
  try {
    const page = await context.newPage();
    const diagnostics = observeDiagnostics(page), readonly = readOnlyRequests(page);
    await page.goto(fixture.origin);
    await action(page, "Learn More").waitFor();
    await settle(page);
    const dimensions = await page.evaluate(() => ({ width: innerWidth, documentWidth: document.documentElement.scrollWidth }));
    assert.ok(dimensions.documentWidth <= dimensions.width + 1, "Horizontal rails must scroll inside themselves, not widen the page");
    for (const name of ["Learn More", "Mount Fuji"]) {
      const target = await box(action(page, name));
      assert.ok(target.width >= 44 && target.height >= 44, `${name}: touch target at least44×44CSSpx`);
    }
    await evidence(page, "home-touch-402x874-dpr3", { dimensions, deviceScaleFactor: 3, diagnostics: diagnostics.snapshot(),
      note: "Browser touch emulation does not validate physical touch or haptics." });
    await action(page, "Learn More").tap();
    await action(page, "Back").waitFor();
    const back = await box(action(page, "Back"));
    assert.ok(back.width >= 44 && back.height >= 44, "Back touch target at least44×44CSSpx");
    await action(page, "Back").tap();
    await card(page, "Mount Fuji").waitFor();
    readonly(); diagnostics.assertClean();
  } finally { await context.close(); await fixture.close(); }
});

test("1600px evidence preserves actual rendered home and detail without claiming parity", async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture;
    await page.setViewportSize({ width: 1600, height: 1000 });
    await settle(page);
    await evidence(page, "home-wide-1600x1000", { viewport: page.viewportSize(), diagnostics: fixture.diagnostics.snapshot(), approval: "pending" });
    await action(page, "Learn More").click();
    await action(page, "Back").waitFor();
    await settle(page);
    const heading = page.getByRole("heading", { name: "Mount Fuji", exact: true });
    const title = await textStyle(heading);
    const back = await buttonGeometry(action(page, "Back"));
    const toolbarBorders = await page.locator('[data-catalog-toolbar]').evaluate(element => {
      const css = getComputedStyle(element); return [css.borderTopWidth, css.borderRightWidth, css.borderBottomWidth, css.borderLeftWidth].map(parseFloat);
    });
    assert.ok(back.radius >= Math.min(back.width, back.height) / 2, "Back is circular/capsule");
    assert.deepEqual(toolbarBorders, [0, 0, 0, 0], "The public toolbar has no border frame");
    await evidence(page, "detail-wide-1600x1000", { viewport: page.viewportSize(), title, back, toolbarBorders, diagnostics: fixture.diagnostics.snapshot(), approval: "pending",
      expectedTitle: { size: 22, line: 26, weight: 700 }, source: "Apple LandmarkDetailView uses macOS title.bold(); no pinned detail screenshot." });
    near(title.size, 22, "detail title font size", .1);
    near(title.line, 26, "detail title line height", .1);
    assert.equal(title.weight, 700);
  } finally { await fixture.close(); }
});
