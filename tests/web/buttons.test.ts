import test from "node:test";
import assert from "node:assert/strict";
import { activePanel, settleMotion } from "./fixture.ts";
import { inspectionFixture as browserFixture, openCatalog } from "./inspection-fixture.ts";

test("one button adapts to actual space; pending replaces its face without changing geometry", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await openCatalog(f.page);
    const pending = f.page.locator('[data-specimen="action:pending"]').getByRole("button", { name: "Diagnostic action", exact: true });
    assert.equal(await pending.getAttribute("aria-busy"), "true");
    assert.equal(await pending.locator('[data-button-label]').isVisible(), false, "pending must not compete with visible text");
    assert.equal(await pending.locator('[data-button-face="pending"]').count(), 1);
    assert.equal(await pending.locator("svg").count(), 1);
    const label = f.page.locator('[data-specimen="action:ready"]').getByRole("button", { name: "Diagnostic action", exact: true });
    await f.page.setViewportSize({ width: 390, height: 844 });
    await label.evaluate(node => { node.style.maxWidth = "64px"; });
    await f.page.waitForFunction(() => document.querySelector('[data-specimen="action:ready"] button')?.getAttribute("data-button-face") === "icon");
    assert.equal(await label.locator('[data-button-label]').isVisible(), false);
    await f.page.setViewportSize({ width: 1600, height: 1000 });
    await label.evaluate(node => { node.style.removeProperty("max-width"); });
    await f.page.waitForFunction(() => document.querySelector('[data-specimen="action:ready"] button')?.getAttribute("data-button-face") === "label");
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
    await openCatalog(f.page);
    await f.page.locator('[data-specimen="transient:locked"]').getByRole("button").click();
    await settleMotion(f.page);
    const dialog = f.page.getByRole("dialog");
    const close = dialog.locator('[data-surface-slot="top"]').getByRole("button", { name: "Close", exact: true });
    assert.equal(await close.isDisabled(), true);
    assert.equal(await dialog.locator('[data-surface-slot="bottom"]').count(), 0,
      "a diagnostic does not invent a product operation to unlock itself");
    await close.and(f.page.locator(':enabled')).waitFor();
    await close.click(); await dialog.waitFor({ state: "hidden" });
    await f.page.getByRole('button', { name:'Notes', exact:true }).click();
    await f.page.getByRole('button', { name:'Create note', exact:true }).click();
    const panel = activePanel(f.page);
    assert.equal(await panel.locator('[data-surface-slot="top"]').getByRole('button', { name:'Close', exact:true }).isEnabled(), true);
    await panel.getByRole('textbox', { name:'Title', exact:true }).fill('Canonical button roles');
    await panel.getByRole('textbox', { name:'Content', exact:true }).fill('A real prepared operation.');
    const footer = panel.locator('[data-surface-slot="bottom"]');
    const primary = footer.getByRole("button", { name: "Create note", exact: true });
    assert.equal(await primary.getAttribute("data-emphasis"), "primary");
    assert.equal(await footer.getByRole("button").count(), 2, "a CTA never replaces mandatory footer dismissal");
    const secondary = footer.getByRole("button", { name: "Close", exact: true });
    assert.equal(await secondary.isEnabled(), true);
    const bounds = (await primary.boundingBox())!;
    const rail = (await footer.boundingBox())!;
    const navigation = (await secondary.boundingBox())!;
    assert.ok(navigation.x + navigation.width < bounds.x, "secondary dismissal precedes primary");
    assert.ok(bounds.width + navigation.width >= rail.width - 56, "both role slots fill the rail");
    assert.equal(await primary.isEnabled(), true);
    await secondary.click(); await panel.waitFor({ state: "hidden" });
    assert.equal((await f.session.read((await f.session.begin('read-note')).id)).length, 0,
      "role and dismissal inspection does not execute the operation");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
