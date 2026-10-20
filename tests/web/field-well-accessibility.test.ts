import test from "node:test";
import assert from "node:assert/strict";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { saveWellEvidence, selectionWell } from "./field-well-expectations.ts";

for (const location of ["bank", "travel"] as const) test(`${location}: the selection announces its visible label and current value`, async () => {
  const f = await publicCatalogFixture();
  try {
    const { page } = f; await page.setViewportSize({ width: 1280, height: 900 });
    const { trigger, well } = await selectionWell(page, location);
    const label = location === "bank" ? "Single choice" : "Destination";
    const value = location === "bank" ? "Second option" : "Mount Fuji";
    const visibleLabel = well.locator('[data-slot="field-label"]');
    assert.equal(await visibleLabel.evaluate(element => element.closest('[aria-hidden="true"]') !== null), false,
      "The label a person sees remains exposed, rather than being hidden to silence duplicate-label warnings");
    assert.equal(await page.getByRole("button", { name: `${label} · Not selected`, exact: true }).count(), 1);
    const before = await trigger.ariaSnapshot();
    await trigger.focus(); await page.keyboard.press("Enter");
    const menu = page.getByRole("listbox"); await menu.waitFor();
    await menu.getByRole("option", { name: value, exact: true }).click(); await menu.waitFor({ state: "hidden" });
    assert.equal(await page.getByRole("button", { name: `${label} · ${value}`, exact: true }).count(), 1,
      "Committing a value immediately updates the native trigger's accessible name");
    assert.match(await well.innerText(), new RegExp(value));
    assert.equal(await trigger.evaluate(element => document.activeElement === element), true);
    if (location === "travel") {
      assert.equal(await visibleLabel.locator('[aria-hidden="true"]').innerText(), "*",
        "Only the decorative required marker is hidden from the name");
    }
    await saveWellEvidence(page, `${location}-accessible-name`, { before, after: await trigger.ariaSnapshot() });
  } finally { await f.close(); }
});
