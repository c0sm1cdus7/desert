import test from "node:test";
import assert from "node:assert/strict";
import type { Locator } from "playwright";
import { browserFixture, settleMotion } from "./fixture.ts";

async function navigation(dialog: Locator) {
  const top = dialog.locator('[data-surface-slot="top"]');
  const bottom = dialog.locator('[data-surface-slot="bottom"]');
  const leading = top.getByRole("button", { name: "Close", exact: true });
  const secondary = bottom.getByRole("button", { name: "Close", exact: true });
  assert.ok(await top.evaluate(node => parseFloat(getComputedStyle(node).paddingLeft)) >= 20, "shared top chrome retains its spacing layer");
  assert.ok(await bottom.evaluate(node => parseFloat(getComputedStyle(node).paddingLeft)) >= 20, "shared bottom chrome retains its spacing layer");
  assert.equal(await leading.getAttribute("data-primitive"), "action");
  assert.equal(await secondary.getAttribute("data-primitive"), "action");
  assert.equal(await top.getByRole("button").count(), 1);
  const closeBox = (await leading.boundingBox())!;
  const titleBox = (await top.getByRole("heading").boundingBox())!;
  assert.ok(closeBox.x + closeBox.width <= titleBox.x, "navigation belongs before the title");
  assert.ok(closeBox.width <= 48, "the canonical top action is icon-width constrained");
  return { leading, secondary };
}

test("desktop popover is an anchored modal transient with shared slots and complete dismissal", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await f.page.getByRole("button", { name: "Renderer catalog", exact: true }).click();
    const trigger = f.page.getByRole("button", { name: "Open contextual information", exact: true });
    await trigger.scrollIntoViewIfNeeded();
    await trigger.focus();
    await f.page.keyboard.press("Enter");
    const dialog = f.page.getByRole("dialog", { name: "Local interaction", exact: true });
    await dialog.waitFor({ state: "visible" });
    await settleMotion(f.page);
    assert.equal(await dialog.getAttribute("data-presentation"), "anchored");
    assert.equal(await dialog.getAttribute("aria-modal"), "true");
    assert.equal(await f.page.locator("[data-popover-overlay]").isVisible(), true);
    const anchor = (await trigger.boundingBox())!;
    const panel = (await dialog.boundingBox())!;
    assert.ok(Math.abs(panel.x - anchor.x) <= 2, "desktop popover starts at its trigger when space permits");
    assert.ok(Math.min(Math.abs(panel.y - anchor.y - anchor.height), Math.abs(anchor.y - panel.y - panel.height)) <= 10);
    const actions = await navigation(dialog);
    for (let i = 0; i < 4; i++) {
      await f.page.keyboard.press("Tab");
      assert.equal(await dialog.evaluate(node => node.contains(document.activeElement)), true);
    }
    await f.page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    assert.equal(await trigger.evaluate(node => node === document.activeElement), true);
    await trigger.click();
    await actions.secondary.click();
    await dialog.waitFor({ state: "hidden" });
    assert.equal(await trigger.evaluate(node => node === document.activeElement), true);
    await trigger.click();
    await actions.leading.click();
    await dialog.waitFor({ state: "hidden" });
    await trigger.click();
    await dialog.waitFor({ state: "visible" });
    await settleMotion(f.page);
    await f.page.mouse.click(2, 2);
    await dialog.waitFor({ state: "hidden" });
    assert.equal(await trigger.evaluate(node => node === document.activeElement), true);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("anchored surfaces resolve viewport collisions and select menus align to their trigger", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await f.page.getByRole("button", { name: "Renderer catalog", exact: true }).click();
    const select = f.page.getByRole("button", { name: "Single choice", exact: true });
    await select.click();
    await settleMotion(f.page);
    const menu = f.page.locator('[data-slot="select-content"]');
    const anchor = (await select.boundingBox())!;
    const list = (await menu.boundingBox())!;
    assert.ok(Math.abs(list.x - anchor.x) <= 2, "select list aligns to the leading edge, not the center");
    assert.ok(list.width >= anchor.width - 2, "select list is at least as wide as its trigger");
    await f.page.keyboard.press("Escape");
    const trigger = f.page.getByRole("button", { name: "Open contextual information", exact: true });
    // Test placement only: exercise the same typed control at the viewport corner.
    await trigger.evaluate(node => { Object.assign(node.style, { position: "fixed", right: "12px", bottom: "12px" }); });
    await trigger.click();
    const dialog = f.page.getByRole("dialog", { name: "Local interaction", exact: true });
    await settleMotion(f.page);
    const panel = (await dialog.boundingBox())!;
    assert.ok(panel.x >= 11 && panel.y >= 11);
    assert.ok(panel.x + panel.width <= 1269 && panel.y + panel.height <= 889);
    assert.equal(await dialog.getAttribute("data-side"), "top", "bottom collision flips the panel above its trigger");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("compact popover follows content height and keeps focus through responsive presentation changes", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await f.page.setViewportSize({ width: 390, height: 844 });
    await f.page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await f.page.getByRole("button", { name: "Renderer catalog", exact: true }).click();
    const trigger = f.page.getByRole("button", { name: "Open contextual information", exact: true });
    await trigger.click();
    const dialog = f.page.getByRole("dialog", { name: "Local interaction", exact: true });
    await dialog.waitFor({ state: "visible" });
    assert.equal(await dialog.getAttribute("data-presentation"), "sheet");
    const panel = (await dialog.boundingBox())!;
    assert.ok(panel.height < 844 * .75, "short information does not turn into a tall full-screen drawer");
    assert.ok(Math.abs(panel.y + panel.height - 836) <= 2, "compact surface remains bottom anchored");
    assert.equal(await dialog.evaluate(node => getComputedStyle(node).animationName), "none");
    await navigation(dialog);
    await f.page.setViewportSize({ width: 1024, height: 800 });
    await f.page.waitForSelector('[data-presentation="anchored"]');
    await f.page.waitForFunction(() => document.querySelector('[data-presentation="anchored"]')?.contains(document.activeElement));
    assert.equal(await dialog.count(), 1);
    assert.equal(await dialog.evaluate(node => node.contains(document.activeElement)), true);
    await f.page.setViewportSize({ width: 390, height: 844 });
    await f.page.waitForSelector('[data-presentation="sheet"]');
    await f.page.waitForFunction(() => document.querySelector('[data-presentation="sheet"]')?.contains(document.activeElement));
    assert.equal(await dialog.evaluate(node => node.contains(document.activeElement)), true);
    await f.page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    assert.equal(await trigger.evaluate(node => node === document.activeElement), true);
    assert.equal(await f.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("locked anchored and compact surfaces retain dismissal and recover without reload", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await f.page.getByRole("button", { name: "Renderer catalog", exact: true }).click();
    for (const width of [1280, 390]) {
      await f.page.setViewportSize({ width, height: 844 });
      await f.page.getByRole("button", { name: "Open locked information", exact: true }).click();
      const dialog = f.page.getByRole("dialog", { name: "Locked information", exact: true });
      await dialog.waitFor({ state: "visible" });
      const { leading, secondary } = await navigation(dialog);
      assert.equal(await leading.isDisabled(), true);
      assert.equal(await secondary.isDisabled(), true);
      await f.page.keyboard.press("Escape");
      await f.page.mouse.click(2, 2);
      assert.equal(await dialog.isVisible(), true);
      if (width === 390) assert.equal(await dialog.getByRole("button", { name: "Close panel", exact: true }).isDisabled(), true);
      await f.page.waitForFunction(() => {
        const close = document.querySelector<HTMLButtonElement>('[role="dialog"] [data-surface-slot="bottom"] button');
        return close && !close.disabled;
      });
      assert.equal(await leading.isEnabled(), true);
      await secondary.click();
      await dialog.waitFor({ state: "hidden" });
      assert.equal(await f.page.getByRole("button", { name: "Open locked information", exact: true })
        .evaluate(node => node === document.activeElement), true);
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("problem dialogs keep one shared bottom dismissal without losing severity", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await f.page.getByRole("button", { name: "Renderer catalog", exact: true }).click();
    for (const [severity, title] of [["error", "The controller did not respond"], ["warning", "No matching record"]] as const) {
      const trigger = f.page.locator(`[data-specimen="problem:${severity}"]`).getByRole("button");
      await trigger.click();
      const dialog = f.page.getByRole("dialog", { name: title, exact: true });
      await dialog.waitFor({ state: "visible" });
      const top = dialog.locator('[data-surface-slot="top"]');
      const bottom = dialog.locator('[data-surface-slot="bottom"]');
      const secondary = bottom.getByRole("button", { name: "Close", exact: true });
      assert.equal(await top.getByRole("button").count(), 0);
      assert.equal(await dialog.getByRole("button", { name: "Close", exact: true }).count(), 1);
      assert.equal(await secondary.getAttribute("data-primitive"), "action");
      assert.ok(await top.evaluate(node => parseFloat(getComputedStyle(node).paddingLeft)) >= 20);
      assert.ok(await bottom.evaluate(node => parseFloat(getComputedStyle(node).paddingLeft)) >= 20);
      assert.equal(await dialog.getByRole("heading", { name: title, exact: true }).count(), 1);
      assert.equal(await dialog.getByRole("region", { name: "Object context", exact: true }).count(), 0);
      assert.equal(await dialog.locator(`[data-surface-slot="top"] [data-piece="face"][data-tone="${severity}"] svg`).count(), 1);
      assert.equal(await dialog.locator('[data-surface-slot="content"] [data-piece="face"]').count(), 0);
      assert.equal(await dialog.locator('[data-surface-slot="content"]').getByText("Your writing has not changed. Close this message to continue.", { exact: true }).count(), 1);
      await secondary.click();
      await dialog.waitFor({ state: "hidden" });
      await trigger.click();
      await f.page.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden" });
      assert.equal(await trigger.evaluate(node => node === document.activeElement), true);
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
