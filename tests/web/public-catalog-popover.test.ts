import test from "node:test";
import assert from "node:assert/strict";
import type { Locator, Page } from "playwright";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { bottomPicker } from "./picker-expectations.ts";
import { action, box, evidence, navigationAction, selectionTrigger, settle } from "./public-catalog-expectations.ts";

// Direct selection is shared by anchored lists and constrained bottom sheets.
// Presentation changes must not change the value, dismissal or focus contract.
const select = selectionTrigger;
const popup = (page: Page) => page.getByRole("listbox");
const reviewVersion = process.env.DESERT_CATALOG_BUILD?.match(/(?:^|-)v(\d+)\/?$/)?.[1];
const capture = (name: string) => `${reviewVersion ? `v${reviewVersion}` : "current"}-${name}`;
async function bank(page: Page, kind: string) {
  await (await navigationAction(page, "Component bank")).click();
  await page.getByRole("searchbox", { name: "Find component", exact: true }).fill(kind);
}
async function nonmodal(page: Page, menu: Locator) {
  assert.equal(await page.getByRole("dialog").count(), 0, "A flat selection is not a dialog");
  assert.equal(await menu.getByRole("toolbar").count(), 0);
  assert.equal(await menu.getByRole("button", { name: /^(Close|Cancel|Confirm)$/ }).count(), 0);
  assert.equal(await page.locator('[aria-modal="true"]:visible').count(), 0);
  const overlays = await page.locator('[data-slot$="overlay"], [data-slot$="scrim"], [data-overlay], [data-scrim]').evaluateAll(elements =>
    elements.filter(element => { const r = element.getBoundingClientRect(), s = getComputedStyle(element);
      return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none"; }).length);
  assert.equal(overlays, 0, "Selection must not add a backdrop, including an invisible interaction shield");
  assert.equal(await page.getByRole("main").evaluate(element => element.closest('[inert], [aria-hidden="true"]') !== null), false);
}
async function anchored(page: Page, trigger: Locator, menu: Locator) {
  await settle(page);
  const anchor = await box(trigger), panel = await box(menu), viewport = page.viewportSize()!;
  assert.ok(panel.x >= -1 && panel.y >= -1 && panel.x + panel.width <= viewport.width + 1 && panel.y + panel.height <= viewport.height + 1,
    `Popup remains inside viewport: ${JSON.stringify({ anchor, panel, viewport })}`);
  const overlapsX = panel.x < anchor.x + anchor.width && panel.x + panel.width > anchor.x;
  const distanceY = Math.max(0, panel.y - (anchor.y + anchor.height), anchor.y - (panel.y + panel.height));
  assert.ok(overlapsX && distanceY <= 16, "Popup remains adjacent to its own opener, not a centered modal or bottom sheet");
  return { anchor, panel, viewport };
}

test("selection is an anchored, toolbar-free nonmodal list and commits immediately", async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture;
    await page.setViewportSize({ width: 1280, height: 800 });
    await (await navigationAction(page, "Travel kit")).click();
    const trigger = select(page, "Destination"), menu = popup(page);
    assert.match(await trigger.innerText(), /Not selected/);
    await trigger.click(); await menu.waitFor();
    await nonmodal(page, menu);
    const geometry = await anchored(page, trigger, menu);
    await evidence(page, capture("destination-open"), { geometry, approval: "pending", diagnostics: fixture.diagnostics.snapshot() });
    await menu.getByRole("option", { name: "Mount Fuji", exact: true }).click();
    await menu.waitFor({ state: "hidden" });
    assert.match(await trigger.innerText(), /Mount Fuji/);
    assert.ok(await trigger.evaluate(element => element === document.activeElement));
    await trigger.click();
    assert.equal(await menu.getByRole("option", { name: "Mount Fuji", exact: true }).getAttribute("aria-selected"), "true");
    await page.keyboard.press("Escape");
    await menu.waitFor({ state: "hidden" });
    assert.match(await trigger.innerText(), /Mount Fuji/);
  } finally { await fixture.close(); }
});

test("selection keyboard commits only on activation; disabled items are skipped and Escape/Tab dismiss", async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture;
    await page.setViewportSize({ width: 1280, height: 800 });
    await bank(page, "control.select");
    const trigger = select(page, "Single choice"), menu = popup(page);
    assert.equal(await select(page, "Disabled choice").isEnabled(), false);
    await trigger.focus(); await page.keyboard.press("ArrowDown"); await menu.waitFor();
    await settle(page);
    await evidence(page, capture("bank-single-choice-open"), { geometry: await anchored(page, trigger, menu), approval: "pending" });
    assert.equal(await menu.getByRole("option", { name: "Unavailable option", exact: true }).getAttribute("aria-disabled"), "true");
    await page.keyboard.press("End");
    await page.keyboard.press("Escape"); await menu.waitFor({ state: "hidden" });
    assert.match(await trigger.innerText(), /Not selected/, "Moving the highlight is not a committed edit");
    assert.ok(await trigger.evaluate(element => element === document.activeElement));
    await trigger.press("ArrowDown"); await menu.waitFor();
    await page.keyboard.press("End"); await page.keyboard.press("Enter");
    await menu.waitFor({ state: "hidden" });
    assert.match(await trigger.innerText(), /Second option/, "End skips the disabled last option");
    await trigger.press("ArrowDown"); await menu.waitFor();
    await page.keyboard.press("Home"); await page.keyboard.press("Enter");
    await menu.waitFor({ state: "hidden" });
    assert.match(await trigger.innerText(), /First option/);
    await trigger.press("ArrowDown"); await menu.waitFor();
    await page.keyboard.press("s"); await page.keyboard.press("Enter");
    await menu.waitFor({ state: "hidden" });
    assert.match(await trigger.innerText(), /Second option/, "Typeahead reaches a named enabled option");
    await trigger.press("ArrowDown"); await menu.waitFor();
    await page.keyboard.press("Tab"); await menu.waitFor({ state: "hidden" });
    assert.match(await trigger.innerText(), /Second option/);
    assert.equal(await menu.isVisible(), false);
    await page.setViewportSize({ width: 402, height: 600 });
    await trigger.click(); await menu.waitFor();
    await evidence(page, capture("bank-single-choice-compact"), { geometry: await bottomPicker(page, menu), approval: "pending" });
    await page.keyboard.press("Escape"); await menu.waitFor({ state: "hidden" });
    assert.ok(await trigger.evaluate(element => element === document.activeElement));
    assert.match(await trigger.innerText(), /Second option/, 'sheet dismissal preserves the selected value');
  } finally { await fixture.close(); }
});

test("outside pointer dismissal keeps the current value and leaves the page usable", async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture;
    await (await navigationAction(page, "Travel kit")).click();
    const trigger = select(page, "Destination"), menu = popup(page);
    await trigger.click(); await menu.waitFor();
    await menu.getByRole("option", { name: "Mount Fuji", exact: true }).click();
    await trigger.click(); await menu.waitFor();
    const outside = page.getByRole("textbox", { name: "Trip name", exact: true });
    await evidence(page, capture("outside-before"), { trigger: await box(trigger), menu: await box(menu), outside: await box(outside) });
    await outside.click();
    await evidence(page, capture("outside-after"), { focused: await page.evaluate(() => ({ tag: document.activeElement?.tagName,
      label: document.activeElement?.getAttribute("aria-label"), id: document.activeElement?.id })),
      menuVisible: await menu.isVisible(), outside: await box(outside) });
    await menu.waitFor({ state: "hidden" });
    assert.ok(await outside.evaluate(element => element === document.activeElement), "Outside click must reach the field, not only dismiss an invisible shield");
    await evidence(page, capture("outside-settled"), { menuVisible: await menu.isVisible(),
      targetFocused: await outside.evaluate(element => element === document.activeElement), selected: await trigger.innerText() });
    await outside.fill("A local draft");
    assert.match(await trigger.innerText(), /Mount Fuji/);
    await (await navigationAction(page, "Landmarks")).click(); await (await navigationAction(page, "Travel kit")).click();
    assert.equal(await outside.inputValue(), "A local draft");
    assert.match(await trigger.innerText(), /Mount Fuji/);
  } finally { await fixture.close(); }
});

test("selection collision handling preserves anchoring where it fits and uses bounded sheets where it does not", async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture;
    await (await navigationAction(page, "Travel kit")).click();
    for (const { viewport, presentation } of [
      { viewport: { width: 900, height: 450 }, presentation: 'anchored' },
      { viewport: { width: 600, height: 450 }, presentation: 'anchored' },
      { viewport: { width: 402, height: 600 }, presentation: 'sheet' },
      { viewport: { width: 320, height: 568 }, presentation: 'sheet' },
    ]) {
      await page.setViewportSize(viewport);
      const trigger = select(page, "Destination"), menu = popup(page);
      await trigger.scrollIntoViewIfNeeded(); await trigger.click(); await menu.waitFor();
      if (presentation === 'anchored') await nonmodal(page, menu);
      const geometry = presentation === 'anchored'
        ? await anchored(page, trigger, menu) : await bottomPicker(page, menu);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await evidence(page, capture(`destination-${viewport.width}x${viewport.height}`), { geometry, approval: "pending" });
      await page.keyboard.press("Escape"); await menu.waitFor({ state: "hidden" });
      assert.ok(await trigger.evaluate(element => element === document.activeElement));
    }
  } finally { await fixture.close(); }
});

test("currency selection commits directly without erasing the typed amount", async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture;
    await bank(page, "control.money");
    const amount = page.getByRole("textbox", { name: "Amount", exact: true });
    // The specimen declares es-AR independently of its currency code.
    await amount.fill("123,40");
    assert.equal(await amount.inputValue(), "123,40", 'verify the amount before opening currency selection');
    await amount.fill("123.40");
    assert.equal(await amount.inputValue(), "123,40", 'malformed grouping is rejected, not reinterpreted as another amount');
    await select(page, "ARS · Amount currency").click();
    const menu = popup(page); await menu.waitFor(); await nonmodal(page, menu);
    await menu.getByRole("option", { name: "USD", exact: true }).click(); await menu.waitFor({ state: "hidden" });
    assert.equal(await amount.inputValue(), "123,40", "Changing same-scale currency preserves locale and lexical amount");
    const trigger = select(page, "USD · Amount currency");
    await trigger.click(); await menu.waitFor(); await page.keyboard.press("Escape"); await menu.waitFor({ state: "hidden" });
    assert.equal(await amount.inputValue(), "123,40");
    await (await navigationAction(page, "Landmarks")).click(); await bank(page, "control.money");
    assert.equal(await amount.inputValue(), "123,40", "Bank navigation retains canonical amount and currency");
    assert.ok(await select(page, "USD · Amount currency").isVisible());
    await evidence(page, capture("currency-retained"), { amount: await amount.inputValue(), diagnostics: fixture.diagnostics.snapshot() });
  } finally { await fixture.close(); }
});
