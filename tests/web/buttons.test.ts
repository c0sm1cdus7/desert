import test from "node:test";
import assert from "node:assert/strict";
import { browserFixture, settleMotion } from "./fixture.ts";

test("one button adapts to actual space; pending replaces its face without changing geometry", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await f.page.getByRole("button", { name: "Renderer catalog", exact: true }).click();
    const pending = f.page.locator('[data-specimen="action:pending"]').getByRole("button", { name: "Save", exact: true });
    assert.equal(await pending.getAttribute("aria-busy"), "true");
    assert.equal(await pending.locator('[data-button-label]').isVisible(), false, "pending must not compete with visible text");
    assert.equal(await pending.locator('[data-button-face="pending"]').count(), 1);
    assert.equal(await pending.locator("svg").count(), 1);
    const label = f.page.locator('[data-specimen="review:uncertain"]').getByRole("button", { name: "Retry same confirmation", exact: true });
    await f.page.setViewportSize({ width: 390, height: 844 });
    await label.evaluate(node => { node.style.maxWidth = "64px"; });
    await f.page.waitForFunction(() => document.querySelector('[aria-label="Retry same confirmation"]')?.getAttribute("data-button-face") === "icon");
    assert.equal(await label.locator('[data-button-label]').isVisible(), false);
    await f.page.setViewportSize({ width: 1600, height: 1000 });
    await label.evaluate(node => { node.style.removeProperty("max-width"); });
    await f.page.waitForFunction(() => document.querySelector('[aria-label="Retry same confirmation"]')?.getAttribute("data-button-face") === "label");
    assert.equal(await label.locator('[data-button-label]').isVisible(), true);
    const save = f.page.locator('[data-specimen="action:ready"]').getByRole("button");
    const before = (await save.boundingBox())!;
    const waiting = (await pending.boundingBox())!;
    assert.equal(before.width, waiting.width);
    assert.equal(before.height, waiting.height);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("drawer requires top close; footer derives primary emphasis and order from roles", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await f.page.getByRole("button", { name: "Renderer catalog", exact: true }).click();
    await f.page.locator('[data-specimen="transient:locked"]').getByRole("button").click();
    await settleMotion(f.page);
    const dialog = f.page.getByRole("dialog");
    const close = dialog.locator('[data-surface-slot="top"]').getByRole("button", { name: "Close", exact: true });
    assert.equal(await close.isDisabled(), true);
    const footer = dialog.locator('[data-surface-slot="bottom"]');
    const primary = footer.getByRole("button", { name: "Finish specimen operation", exact: true });
    assert.equal(await primary.getAttribute("data-emphasis"), "primary");
    assert.equal(await footer.getByRole("button").count(), 2, "a CTA never replaces mandatory footer dismissal");
    const secondary = footer.getByRole("button", { name: "Close", exact: true });
    assert.equal(await secondary.isDisabled(), true);
    const bounds = (await primary.boundingBox())!;
    const rail = (await footer.boundingBox())!;
    const navigation = (await secondary.boundingBox())!;
    assert.ok(navigation.x + navigation.width < bounds.x, "secondary dismissal precedes primary");
    assert.ok(bounds.width + navigation.width >= rail.width - 56, "both role slots fill the rail");
    await primary.click();
    assert.equal(await close.isEnabled(), true);
    await close.click(); await dialog.waitFor({ state: "hidden" });
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
