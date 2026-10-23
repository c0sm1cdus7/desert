import test from "node:test";
import assert from "node:assert/strict";
import { settleMotion } from "./fixture.ts";
import { inspectionFixture, openCatalog } from "./inspection-fixture.ts";
import { selectionTrigger } from "./public-catalog-expectations.ts";

test("contextual popover stays anchored and nonmodal with complete keyboard dismissal", { timeout: 30000 }, async () => {
  const f = await inspectionFixture();
  try {
    await openCatalog(f.page);
    const trigger = f.page.getByRole("button", { name: "Open contextual information", exact: true });
    await trigger.focus(); await f.page.keyboard.press("Enter");
    const dialog = f.page.getByRole("dialog", { name: "Local interaction", exact: true });
    await dialog.waitFor(); await settleMotion(f.page);
    assert.equal(await dialog.getAttribute("data-presentation"), "anchored");
    assert.equal(await dialog.getAttribute("aria-modal"), "false");
    assert.equal(await f.page.locator("[data-popover-overlay]").count(), 0);
    assert.equal(await dialog.locator('[data-surface-slot="top"], [data-surface-slot="bottom"]').count(), 0,
      "a contextual popup is not a journey and has no modal chrome");
    const anchor = (await trigger.boundingBox())!, panel = (await dialog.boundingBox())!;
    assert.ok(Math.abs(panel.x - anchor.x) <= 2);
    assert.ok(Math.min(Math.abs(panel.y - anchor.y - anchor.height), Math.abs(anchor.y - panel.y - panel.height)) <= 10);
    await f.page.keyboard.press("Escape"); await dialog.waitFor({ state: "hidden" });
    assert.equal(await trigger.evaluate(node => node === document.activeElement), true);
    await trigger.click(); await f.page.keyboard.press("Tab"); await dialog.waitFor({ state: "hidden" });
    assert.equal(await trigger.evaluate(node => node === document.activeElement), false,
      "Tab continues ordinary document navigation instead of trapping focus");
    await trigger.click(); await f.page.mouse.click(2, 2); await dialog.waitFor({ state: "hidden" });
    assert.equal(await trigger.getAttribute("aria-expanded"), "false");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("anchored surfaces resolve viewport collisions and select menus align to their trigger", { timeout: 30000 }, async () => {
  const f = await inspectionFixture();
  try {
    await openCatalog(f.page);
    const select = selectionTrigger(f.page, "Single choice");
    await select.click(); await settleMotion(f.page);
    const menu = f.page.getByRole("listbox").locator('xpath=ancestor::*[@data-slot="popover-content"][1]');
    const anchor = (await select.boundingBox())!, list = (await menu.boundingBox())!;
    assert.ok(Math.abs(list.x - anchor.x) <= 2);
    assert.ok(list.width >= anchor.width - 2);
    await f.page.keyboard.press("Escape");
    const trigger = f.page.getByRole("button", { name: "Open contextual information", exact: true });
    await trigger.evaluate(node => Object.assign(node.style, { position: "fixed", right: "12px", bottom: "12px" }));
    await trigger.click();
    const dialog = f.page.getByRole("dialog", { name: "Local interaction", exact: true });
    await settleMotion(f.page);
    const panel = (await dialog.boundingBox())!;
    assert.ok(panel.x >= 11 && panel.y >= 11);
    assert.ok(panel.x + panel.width <= 1269 && panel.y + panel.height <= 889);
    assert.equal(await dialog.getAttribute("data-side"), "top");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("contextual information remains contained and anchored through compact resizing", { timeout: 30000 }, async () => {
  const f = await inspectionFixture();
  try {
    await openCatalog(f.page);
    await f.page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    const trigger = f.page.getByRole("button", { name: "Open contextual information", exact: true });
    for (const width of [390, 1024, 320]) {
      await f.page.setViewportSize({ width, height: 844 }); await trigger.click();
      const dialog = f.page.getByRole("dialog", { name: "Local interaction", exact: true });
      await dialog.waitFor(); await settleMotion(f.page);
      assert.equal(await dialog.getAttribute("data-presentation"), "anchored");
      assert.equal(await dialog.getAttribute("aria-modal"), "false");
      const panel = (await dialog.boundingBox())!;
      assert.ok(panel.height < 844 * .75);
      assert.ok(panel.x >= 0 && panel.x + panel.width <= width + 1 && panel.y >= 0 && panel.y + panel.height <= 845);
      assert.equal(await dialog.evaluate(node => getComputedStyle(node).animationName), "none");
      await f.page.keyboard.press("Escape"); await dialog.waitFor({ state: "hidden" });
      assert.equal(await trigger.evaluate(node => node === document.activeElement), true);
      assert.equal(await f.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("locked information prevents Escape and outside dismissal, then unlocks without reload", { timeout: 30000 }, async () => {
  const f = await inspectionFixture();
  try {
    await openCatalog(f.page);
    for (const width of [1280, 390]) {
      await f.page.setViewportSize({ width, height: 844 });
      const trigger = f.page.getByRole("button", { name: "Open locked information", exact: true });
      await trigger.click();
      const dialog = f.page.getByRole("dialog", { name: "Locked information", exact: true });
      await dialog.waitFor();
      assert.equal(await dialog.getByRole("button").count(), 0, "the demonstration does not invent a product operation");
      await f.page.keyboard.press("Escape"); await f.page.mouse.click(2, 2);
      assert.equal(await dialog.isVisible(), true);
      await f.page.waitForTimeout(3100);
      await dialog.focus(); await f.page.keyboard.press("Escape"); await dialog.waitFor({ state: "hidden" });
      assert.equal(await trigger.evaluate(node => node === document.activeElement), true);
      if (width === 1280) { await f.page.getByRole("button", { name: "Notes", exact: true }).click(); await openCatalog(f.page); }
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("problem dialogs keep one shared bottom dismissal without losing severity", { timeout: 30000 }, async () => {
  const f = await inspectionFixture();
  try {
    await openCatalog(f.page);
    for (const severity of ["error", "warning"] as const) {
      const title = `Example ${severity}`, trigger = f.page.locator(`[data-specimen="problem:${severity}"]`).getByRole("button");
      await trigger.click();
      const dialog = f.page.getByRole("dialog", { name: title, exact: true }); await dialog.waitFor();
      const top = dialog.locator('[data-surface-slot="top"]');
      const close = dialog.locator('[data-surface-slot="bottom"]').getByRole("button", { name: "Close", exact: true });
      assert.equal(await top.getByRole("button").count(), 0);
      assert.equal(await dialog.getByRole("button", { name: "Close", exact: true }).count(), 1);
      assert.equal(await close.getAttribute("data-primitive"), "action");
      assert.equal(await dialog.getByRole("heading", { name: title, exact: true }).count(), 1);
      assert.equal(await dialog.getByRole("region", { name: "Object context", exact: true }).count(), 0);
      assert.equal(await top.locator(`[data-piece="face"][data-tone="${severity}"] svg`).count(), 1);
      assert.equal(await dialog.locator('[data-surface-slot="content"] [data-piece="face"]').count(), 0);
      assert.equal(await dialog.locator('[data-surface-slot="content"]').getByText("An isolated message example. No product request failed.", { exact: true }).count(), 1);
      await close.click(); await dialog.waitFor({ state: "hidden" });
      await trigger.click(); await f.page.keyboard.press("Escape"); await dialog.waitFor({ state: "hidden" });
      assert.equal(await trigger.evaluate(node => node === document.activeElement), true);
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
