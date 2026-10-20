import test from "node:test";
import assert from "node:assert/strict";
import { basename } from "node:path";
import type { Page } from "playwright";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { action, box, evidence, readOnlyRequests, search, settle } from "./public-catalog-expectations.ts";
import { observeDiagnostics } from "./public-catalog-diagnostics.ts";

// Independent user-visible expectations, written against frozen v7 before fixes.
// Full destination names, coherent toolbar geometry, visible keyboard focus and
// operable compact navigation matter; no production CSS values are the oracle.
const revision = basename(process.env.DESERT_CATALOG_BUILD ?? "landmarks-web-v1");
const navigation = (page: Page) => page.getByRole("navigation", { name: "Main navigation", exact: true });
const hideNavigation = (page: Page) => page.getByRole("button", { name: /^(Hide|Toggle) navigation$/ }).first();
const capture = (page: Page, name: string, values: unknown) => evidence(page, `sidebar-${revision}-${name}`, values);

async function resizeNavigation(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  // Readiness only: media-query change events can follow setViewportSize/animations.
  await page.locator(`[data-slot="sidebar-wrapper"][data-presentation="${width < 960 ? "overlay" : "docked"}"]`).waitFor({ state: "attached" });
  await settle(page);
}

async function focusState(page: Page) {
  return page.evaluate(() => {
    const element = document.activeElement as HTMLElement | null, rect = element?.getBoundingClientRect();
    return { tag: element?.tagName, label: element?.getAttribute("aria-label"),
      text: element?.textContent?.slice(0, 100), visible: !!rect && rect.width > 0 && rect.height > 0 &&
        rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight,
      inNavigation: !!element?.closest("nav"), focusVisible: element?.matches(":focus-visible") };
  });
}

test("desktop sidebar shows complete destination names without truncation", async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture;
    await page.setViewportSize({ width: 1100, height: 760 });
    await navigation(page).waitFor(); await settle(page);
    const rows = await navigation(page).getByRole("button").evaluateAll(elements => elements.map(element => {
      const label = element.querySelector("span:last-child") as HTMLElement;
      const range = document.createRange(); range.selectNodeContents(label);
      const glyphs = range.getBoundingClientRect(), bounds = label.getBoundingClientRect();
      return { name: element.getAttribute("aria-label"), text: label.textContent?.trim(),
        labelWidth: bounds.width, glyphWidth: glyphs.width, rowWidth: element.getBoundingClientRect().width };
    }));
    await capture(page, "desktop-labels", { rows, navigation: await box(navigation(page)),
      expectation: "All three installed destinations have complete visible names, fitting at normal text size." });
    for (const row of rows) {
      assert.equal(row.text, row.name, `Visible navigation should say ${row.name}, not an unexplained abbreviation`);
      assert.ok(row.glyphWidth <= row.labelWidth + 1, `${row.name} must fit without ellipsis`);
    }
  } finally { await fixture.close(); }
});

test("sidebar toggle aligns with the product name while Back stays in the place toolbar", async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture;
    await page.setViewportSize({ width: 1100, height: 760 });
    await action(page, "Learn More").click(); await action(page, "Back").waitFor(); await settle(page);
    const toggle = await box(hideNavigation(page)), back = await box(action(page, "Back"));
    // The owner superseded the bottom ghost disclosure with a filled header action.
    const name = await box(page.locator('[data-product-name]'));
    await capture(page, "header-disclosure", { toggle, back, name,
      expectation: "Sidebar disclosure aligns with the product identity; place navigation stays above its content." });
    assert.ok(Math.abs(toggle.y + toggle.height / 2 - name.y - name.height / 2) < 2);
    assert.ok(toggle.x + toggle.width < back.x, "The two controls belong to separate panes");
  } finally { await fixture.close(); }
});

test("navigation disclosure exposes its state and controlled region to assistive technology", async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture;
    await page.setViewportSize({ width: 1100, height: 760 });
    const toggle = hideNavigation(page); await toggle.waitFor(); await settle(page);
    const state = await toggle.evaluate(element => ({ expanded: element.getAttribute("aria-expanded"),
      controls: element.getAttribute("aria-controls"), controlledExists: !!document.getElementById(element.getAttribute("aria-controls") ?? "") }));
    await capture(page, "disclosure-semantics", state);
    assert.equal(state.expanded, "true", "Open navigation must be announced as expanded");
    assert.ok(state.controls && state.controlledExists, "Toggle must identify the region it controls");
    await toggle.click(); await settle(page);
    assert.equal(await action(page, "Show navigation").getAttribute("aria-expanded"), "false");
  } finally { await fixture.close(); }
});

test("hiding desktop navigation preserves visible focus and removes hidden choices from Tab order", async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture;
    await page.setViewportSize({ width: 1100, height: 760 });
    const toggle = hideNavigation(page); await toggle.waitFor();
    await toggle.focus(); await page.keyboard.press("Enter"); await settle(page);
    const afterHide = await focusState(page), tabStops = [];
    for (let index = 0; index < 4; index++) {
      await page.keyboard.press("Tab"); tabStops.push(await focusState(page));
    }
    await capture(page, "hidden-keyboard-navigation", { afterHide, tabStops,
      accessibleNavigationCount: await navigation(page).count() });
    assert.ok(afterHide.visible, "Hiding navigation must transfer focus to the visible Show navigation control");
    assert.equal(afterHide.label, "Show navigation");
    assert.ok(tabStops.every(stop => !stop.inNavigation), "Collapsed navigation must not retain tabbable offscreen destinations");
    assert.equal(await navigation(page).count(), 0, "Collapsed navigation must leave the accessibility tree");
    await action(page, "Show navigation").focus(); await page.keyboard.press("Enter"); await settle(page);
    assert.ok((await focusState(page)).visible, "Showing navigation must not drop keyboard focus to the page body");
    assert.notEqual((await focusState(page)).tag, "BODY");
  } finally { await fixture.close(); }
});

test("compact touch navigation has named accessible chrome, 44px targets and a complete dismissal flow", async () => {
  const fixture = await publicCatalogFixture();
  const context = await fixture.browser.newContext({ viewport: { width: 402, height: 874 },
    deviceScaleFactor: 3, isMobile: true, hasTouch: true, colorScheme: "dark", reducedMotion: "reduce" });
  try {
    const page = await context.newPage(), diagnostics = observeDiagnostics(page), readonly = readOnlyRequests(page);
    await page.goto(fixture.origin); await action(page, "Show navigation").tap();
    const dialog = page.getByRole("dialog"); await dialog.waitFor(); await settle(page);
    const targets = await dialog.getByRole("button").evaluateAll(elements => elements.map(element => {
      const bounds = element.getBoundingClientRect();
      return { name: element.getAttribute("aria-label"), width: bounds.width, height: bounds.height };
    }));
    const snapshot = await dialog.ariaSnapshot();
    await capture(page, "touch-open", { targets, snapshot, bounds: await box(dialog),
      limitation: "Chromium touch emulation, not physical-device qualification." });
    await action(page, "Travel kit").tap(); await dialog.waitFor({ state: "hidden" }); await settle(page);
    assert.ok(await page.getByRole("heading", { name: "Travel kit", exact: true }).isVisible());
    assert.ok(await page.getByRole("main").evaluate(element => element.contains(document.activeElement)), "Choosing a destination moves focus into its content");
    await action(page, "Show navigation").tap(); await dialog.waitFor(); await settle(page);
    assert.equal(await action(page, "Travel kit").getAttribute("aria-current"), "page");
    await page.keyboard.press("Escape"); await dialog.waitFor({ state: "hidden" }); await settle(page);
    assert.equal((await focusState(page)).label, "Show navigation", "Escape returns focus to the opener");
    assert.ok(targets.every(target => target.width >= 44 && target.height >= 44), "Touch navigation targets must be at least44×44CSSpx");
    assert.match(snapshot.split("\n")[0]!, /dialog ".*navigation/i, "The overlay should announce its purpose, not the internal component name Sidebar");
    readonly(); diagnostics.assertClean();
  } finally { await context.close(); await fixture.close(); }
});

test("resizing an open compact navigation to desktop retains a visible keyboard location", async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture;
    await page.setViewportSize({ width: 600, height: 740 });
    await action(page, "Show navigation").focus(); await page.keyboard.press("Enter");
    await page.getByRole("dialog").waitFor(); await settle(page);
    await action(page, "Travel kit").focus();
    await page.setViewportSize({ width: 1100, height: 740 }); await settle(page);
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    const focus = await focusState(page);
    await capture(page, "compact-to-desktop", { focus, navigation: await box(navigation(page)) });
    assert.notEqual(focus.tag, "BODY", "Responsive navigation must not discard keyboard focus when its presentation changes");
    assert.ok(focus.visible, "The focused destination or navigation control must remain visible after resizing");
    assert.ok(await action(page, "Travel kit").isEnabled());
  } finally { await fixture.close(); }
});

test("959px compact and960px desktop navigation adapt without restoring a stale modal", async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture;
    await resizeNavigation(page, 960, 740);
    const desktop = { navigationCount: await navigation(page).count(), dialogCount: await page.getByRole("dialog").count() };
    await resizeNavigation(page, 959, 740);
    const compact = { navigationCount: await navigation(page).count(), showCount: await action(page, "Show navigation").count() };
    await capture(page, "responsive-boundary", { desktop, compact,
      expectation: "The agreed regular-width boundary is960px; a narrower navigation is explicitly opened and never stale." });
    assert.equal(desktop.navigationCount, 1, "960px uses a discoverable regular sidebar");
    assert.equal(desktop.dialogCount, 0);
    assert.equal(compact.navigationCount, 0, "959px reserves the full page width for content until navigation is requested");
    assert.equal(compact.showCount, 1);
    await action(page, "Show navigation").click(); await page.getByRole("dialog").waitFor(); await settle(page);
    await resizeNavigation(page, 960, 740);
    await page.getByRole("dialog").waitFor({ state: "hidden" }); await settle(page);
    await resizeNavigation(page, 959, 740);
    assert.equal(await page.getByRole("dialog").count(), 0, "Returning to compact must not reopen a previously dismissed modal");
    await action(page, "Show navigation").click(); await page.getByRole("dialog").waitFor(); await settle(page);
    await page.keyboard.press("Escape"); await page.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal((await focusState(page)).label, "Show navigation");
  } finally { await fixture.close(); }
});

test("responsive navigation does not steal an active search draft or typing focus", async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture;
    await page.setViewportSize({ width: 1100, height: 740 });
    const input = await search(page);
    await input.fill("Fuji"); await settle(page);
    for (const width of [959, 960, 1100]) {
      await resizeNavigation(page, width, 740);
      const state = { width, query: await input.inputValue(), focus: await focusState(page) };
      await capture(page, `search-focus-${width}`, state);
      assert.equal(state.query, "Fuji", "A navigation presentation change must preserve the active search draft");
      assert.ok(await input.evaluate(element => element === document.activeElement), "Resizing navigation must not steal focus from an active search field");
    }
  } finally { await fixture.close(); }
});
