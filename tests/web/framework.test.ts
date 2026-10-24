import test from "node:test";
import assert from "node:assert/strict";
import AxeBuilder from "@axe-core/playwright";
import { gapNote, inspectionFixture as browserFixture, openCatalog } from "./inspection-fixture.ts";
import { ResolvedNodes } from "../../src/interaction/catalog.ts";

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
    assert.ok(await dialog.locator('[data-surface-slot="top"]').getByRole("button", { name: "Close", exact: true }).evaluate(node => node.getBoundingClientRect().height) >= 44);
    assert.equal(await dialog.locator('[data-surface-slot="bottom"]').getByRole("button", { name: "Close", exact: true }).isEnabled(), true);
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
    await openCatalog(f.page);
    for (const entry of ResolvedNodes.entries) {
      for (const state of entry.states) assert.equal(await f.page.locator(`[data-view-item="specimen:${entry.id}:${state}"]`).count(), 1);
    }
    await f.page.locator('[data-view-item="specimen:transient:open"]').getByRole("button").click();
    await f.page.getByRole("dialog", { name: "Diagnostic transient", exact: true }).waitFor();
    await f.page.keyboard.press("Escape");
    await f.page.getByRole("dialog", { name: "Diagnostic transient", exact: true }).waitFor({ state: "hidden" });
    for (const kind of ["form", "review"]) for (const entry of ResolvedNodes.entries.filter(entry => entry.id === kind)) {
      for (const state of entry.states) {
        const specimen = f.page.locator(`[data-view-item="specimen:${kind}:${state}"]`);
        assert.equal(await specimen.locator(gapNote).count(), 1, "a coverage gap is the unavailable note in place of the specimen");
        assert.equal(await specimen.getByRole("button").count(), 0, "read-only inspection never invents submission or acceptance");
      }
    }
    assert.equal(await f.page.locator('[data-view-item="specimen:context:available"]').locator(gapNote).count(), 0, "a rendered specimen has no gap note");
    assert.equal(await f.page.locator('[data-view-item="specimen:context:available"] [data-row="open"]').count(), 0,
      "only published product commands can become object actions; a specimen cannot fake availability");
    assert.equal(await f.page.locator('[data-view-item="specimen:context:unavailable"]').locator(gapNote).count(), 1);
    assert.deepEqual((await new AxeBuilder({ page: f.page }).analyze()).violations, []);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
