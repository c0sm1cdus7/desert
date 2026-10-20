import test from "node:test";
import assert from "node:assert/strict";
import AxeBuilder from "@axe-core/playwright";
import { browserFixture } from "./fixture.ts";
import { InteractionCatalog } from "../../src/interaction/catalog.ts";

test("the form has a labelled modal, keyboard focus containment, reduced motion and retained drafts", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await f.page.emulateMedia({ reducedMotion: "reduce" });
    const opener = f.page.getByRole("button", { name: "Create note", exact: true }).first();
    await opener.click();
    const dialog = f.page.getByRole("dialog", { name: "Create note", exact: true });
    await dialog.waitFor();
    const title = dialog.getByRole("textbox", { name: "Title", exact: true });
    await title.fill("Retained on close");
    assert.equal(await title.getAttribute("required"), "");
    assert.equal(await title.evaluate(node => getComputedStyle(node).outlineStyle), "none");
    assert.ok(await dialog.locator('[data-surface-slot="top"]').getByRole("button", { name: "Back", exact: true }).evaluate(node => node.getBoundingClientRect().height) >= 44);
    assert.equal(await dialog.locator('[data-surface-slot="bottom"]').getByRole("button", { name: "Back", exact: true }).isEnabled(), true);
    for (let i = 0; i < 12; i++) {
      await f.page.keyboard.press("Tab");
      assert.equal(await dialog.evaluate(node => node.contains(document.activeElement)), true);
    }
    assert.deepEqual((await new AxeBuilder({ page: f.page }).analyze()).violations, []);
    await f.page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    assert.equal(await opener.evaluate(node => node === document.activeElement), true);
    await opener.click();
    assert.equal(await title.inputValue(), "Retained on close");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("the kitchen sink covers every installed catalog state and opens the real shared drawer", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await f.page.getByRole("button", { name: "Renderer catalog", exact: true }).click();
    for (const entry of InteractionCatalog.entries) {
      for (const state of entry.states) assert.equal(await f.page.locator(`[data-specimen="${entry.id}:${state}"]`).count(), 1);
    }
    await f.page.locator('[data-specimen="transient:open"]').getByRole("button").click();
    await f.page.getByRole("dialog", { name: "Transient specimen", exact: true }).waitFor();
    await f.page.keyboard.press("Escape");
    await f.page.getByRole("dialog", { name: "Transient specimen", exact: true }).waitFor({ state: "hidden" });
    for (const state of ["available", "unavailable"]) {
      await f.page.locator(`[data-specimen="context:${state}"]`).getByRole("button", { name: "Open context", exact: true }).click();
      const actions = f.page.getByRole("region", { name: "Actions", exact: true });
      const row = actions.locator('[data-piece="destination-row"]');
      assert.equal(await row.count(), 3);
      for (const item of await row.all()) assert.equal(await item.isDisabled(), state === "unavailable");
      assert.equal(await row.locator('[data-destination-chevron]').count(), 3);
      assert.equal(await actions.locator('[data-primitive="action"]').count(), 0);
      await f.page.keyboard.press("Escape");
      await f.page.getByRole("dialog").waitFor({ state: "hidden" });
    }
    assert.deepEqual((await new AxeBuilder({ page: f.page }).analyze()).violations, []);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
