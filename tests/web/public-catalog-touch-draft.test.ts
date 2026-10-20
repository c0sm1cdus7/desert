import test from "node:test";
import assert from "node:assert/strict";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { action, box, evidence, readOnlyRequests, selectionTrigger, settle } from "./public-catalog-expectations.ts";
import { observeDiagnostics } from "./public-catalog-diagnostics.ts";

test("compact destination uses anchored direct selection and changes no business state", async () => {
  const fixture = await publicCatalogFixture();
  const context = await fixture.browser.newContext({ viewport: { width: 402, height: 874 },
    deviceScaleFactor: 3, isMobile: true, hasTouch: true, colorScheme: "dark", reducedMotion: "reduce" });
  try {
    const page = await context.newPage();
    const diagnostics = observeDiagnostics(page), readonly = readOnlyRequests(page);
    await page.goto(fixture.origin);
    await action(page, "Show navigation").tap();
    await action(page, "Travel kit").tap();
    const trigger = selectionTrigger(page, "Destination"), dialog = page.getByRole("listbox");
    await trigger.tap();
    await dialog.waitFor();
    await settle(page);
    const bounds = await box(dialog);
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 403, "Selection stays within the compact viewport");
    for (const label of ["Mount Fuji", "Wulingyuan", "Mount Everest"]) {
      const button = dialog.getByRole("option", { name: label, exact: true }), target = await box(button);
      assert.ok(target.width >= 44 && target.height >= 44, `${label} needs a 44px touch target`);
      assert.ok(target.y >= 0 && target.y + target.height <= 875, `${label} remains reachable within the viewport`);
    }
    await evidence(page, "draft-selection-touch-402x874-dpr3", { bounds, diagnostics: diagnostics.snapshot(),
      approval: "pending", limitation: "Emulated touch; no native presentation or physical-device claim." });
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    assert.match(await trigger.innerText(), /Not selected/);
    await trigger.tap();
    await dialog.getByRole("option", { name: "Mount Fuji", exact: true }).tap();
    await dialog.waitFor({ state: "hidden" });
    assert.match(await trigger.innerText(), /Mount Fuji/);
    readonly(); diagnostics.assertClean();
  } finally { try { await context.close(); } finally { await fixture.close(); } }
});
