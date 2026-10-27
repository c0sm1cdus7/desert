import assert from "node:assert/strict";
import test from "node:test";
import AxeBuilder from "@axe-core/playwright";
import { activePanel, settleMotion, waitForNote } from "./fixture.ts";
import { inspectionFixture as browserFixture, openCatalog } from "./inspection-fixture.ts";

test("creation replaces its form with the saved object's own view in its dock", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await f.page.setViewportSize({ width: 1600, height: 1000 });
    await f.page.getByRole("button", { name: "Create note", exact: true }).click();
    const old = await activePanel(f.page).locator('form').elementHandle();
    await f.page.getByRole("textbox", { name: "Title", exact: true }).fill("Separate surfaces");
    await f.page.getByRole("textbox", { name: "Content", exact: true }).fill("One identity per transient.");
    await activePanel(f.page).getByRole("button", { name: "Create note", exact: true }).click();
    await waitForNote(f.page, "Separate surfaces");
    await f.page.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(await old!.evaluate(element => element.isConnected), false);
    assert.equal(await f.page.getByRole("dialog").count(), 0);
    assert.deepEqual((await new AxeBuilder({ page: f.page }).analyze()).violations, []);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("mobile dark drawer follows a drag, springs back, respects reduced motion and blocks dismissal while locked", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await f.page.setViewportSize({ width: 390, height: 844 });
    await f.page.emulateMedia({ colorScheme: "dark" });
    await openCatalog(f.page);
    const trigger = f.page.locator('[data-view-item="specimen:transient:open"]').getByRole("button");
    await trigger.click();
    const dialog = f.page.getByRole("dialog", { name: "Diagnostic transient", exact: true });
    const grip = dialog.getByRole("button", { name: "Close panel", exact: true });
    await settleMotion(f.page);
    const box = (await grip.boundingBox())!;
    assert.ok(box.height >= 44);
    await f.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await f.page.mouse.down();
    await f.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 45, { steps: 5 });
    await f.page.waitForFunction(() => {
      const node = document.querySelector('[data-composition="transient"]');
      return node && new DOMMatrix(getComputedStyle(node).transform).m42 > 20;
    });
    await f.page.mouse.up();
    await f.page.waitForFunction(() => {
      const node = document.querySelector('[data-composition="transient"]');
      return node && Math.abs(new DOMMatrix(getComputedStyle(node).transform).m42) < 1;
    });
    assert.equal(await dialog.isVisible(), true);
    assert.deepEqual((await new AxeBuilder({ page: f.page }).analyze()).violations, []);
    await f.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await f.page.mouse.down();
    await f.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 140, { steps: 8 });
    await f.page.mouse.up();
    await dialog.waitFor({ state: "hidden" });
    await f.page.emulateMedia({ reducedMotion: "reduce" });
    await f.page.locator('[data-view-item="specimen:transient:locked"]').getByRole("button").click();
    assert.equal(await dialog.evaluate(node => getComputedStyle(node).animationName), "none");
    await f.page.keyboard.press("Escape");
    assert.equal(await dialog.isVisible(), true);
    assert.equal(await dialog.locator('[data-surface-slot="top"]').getByRole("button", { name: "Close", exact: true }).isDisabled(), true);
    assert.equal(await dialog.getByRole("button", { name: "Close panel", exact: true }).isDisabled(), true);
    assert.equal(await dialog.locator('[data-surface-slot="bottom"]').count(), 0, "diagnostic information has no invented footer operation");
    await dialog.locator('[data-surface-slot="top"]').getByRole("button", { name: "Close", exact: true }).and(f.page.locator(':enabled')).waitFor();
    await dialog.locator('[data-surface-slot="top"]').getByRole("button", { name: "Close", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    assert.equal(await f.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
