import test from "node:test";
import assert from "node:assert/strict";
import AxeBuilder from "@axe-core/playwright";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { navigationAction, settle } from "./public-catalog-expectations.ts";
import { openMessage, messageGeometry, messageViolations, saveMessageEvidence } from "./macos-message-expectations.ts";

test("warning and error messages use one compact centered alert composition", { timeout: 60000 }, async () => {
  const f = await publicCatalogFixture(), failures: string[] = [];
  try {
    await f.page.setViewportSize({ width: 1280, height: 900 });
    for (const theme of ["dark", "light"] as const) for (const severity of ["warning", "error"] as const) {
      await f.page.emulateMedia({ colorScheme: theme });
      const { dialog } = await openMessage(f.page, severity);
      const geometry = await messageGeometry(dialog), violations = messageViolations(geometry);
      failures.push(...violations.map(item => `${theme}/${severity}: ${item}`));
      await saveMessageEvidence(f.page, `${theme}-${severity}-desktop`, { geometry, violations });
      await f.page.keyboard.press("Escape"); await dialog.waitFor({ state: "hidden" });
    }
    assert.deepEqual(failures, []);
  } finally { await f.close(); }
});

test("message dismissal preserves keyboard containment and returns to its own trigger", { timeout: 30000 }, async () => {
  const f = await publicCatalogFixture();
  try {
    await f.page.setViewportSize({ width: 1280, height: 900 });
    const { trigger, dialog } = await openMessage(f.page, "warning");
    assert.equal(await dialog.getByRole("button", { name: "Close", exact: true }).count(), 1);
    for (const key of ["Tab", "Tab", "Shift+Tab"]) {
      await f.page.keyboard.press(key);
      assert.ok(await dialog.evaluate(element => element.contains(document.activeElement)), "focus stays in modal");
    }
    const close = dialog.getByRole("button", { name: "Close", exact: true });
    await close.focus(); await f.page.keyboard.press("Enter"); await dialog.waitFor({ state: "hidden" });
    assert.ok(await trigger.evaluate(node => node === document.activeElement));
    await trigger.press("Enter"); await dialog.waitFor(); await f.page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    assert.ok(await trigger.evaluate(node => node === document.activeElement));
  } finally { await f.close(); }
});

test("messages remain contained and legible at compact width and 200 percent text", { timeout: 60000 }, async () => {
  const f = await publicCatalogFixture(), failures: string[] = [];
  try {
    for (const width of [390, 320]) for (const scale of [1, 2]) {
      await f.page.setViewportSize({ width, height: 844 });
      await f.page.emulateMedia({ reducedMotion: "reduce" });
      await f.page.evaluate(scale => document.documentElement.style.setProperty("--text-scale", String(scale)), scale);
      const { dialog } = await openMessage(f.page, "warning");
      const geometry = await messageGeometry(dialog), violations = messageViolations(geometry, scale);
      failures.push(...violations.map(item => `${width}/${scale}: ${item}`));
      const bounds = await dialog.boundingBox(); assert.ok(bounds);
      for (const action of await dialog.getByRole("button").all()) {
        await action.scrollIntoViewIfNeeded(); const box = await action.boundingBox(); assert.ok(box);
        assert.ok(box.y >= 0 && box.y + box.height <= 844, "all dismissal actions remain reachable");
      }
      await saveMessageEvidence(f.page, `compact-${width}-scale-${scale}`, { geometry, violations });
      await f.page.keyboard.press("Escape"); await dialog.waitFor({ state: "hidden" });
    }
    assert.deepEqual(failures, []);
  } finally { await f.close(); }
});

test("message semantics pass automated accessibility checks in light and dark", { timeout: 60000 }, async () => {
  const f = await publicCatalogFixture();
  try {
    for (const theme of ["light", "dark"] as const) {
      await f.page.emulateMedia({ colorScheme: theme });
      const { dialog } = await openMessage(f.page, "error");
      const result = await new AxeBuilder({ page: f.page }).include('[data-composition="problem"]').analyze();
      await saveMessageEvidence(f.page, `accessibility-${theme}`, { violations: result.violations });
      assert.deepEqual(result.violations.filter(item => item.impact === "serious" || item.impact === "critical"), []);
      await f.page.keyboard.press("Escape"); await dialog.waitFor({ state: "hidden" });
    }
  } finally { await f.close(); }
});

test("existing locked transient still refuses Escape and pointer dismissal until unlocked", { timeout: 30000 }, async () => {
  const f = await publicCatalogFixture();
  try {
    await (await navigationAction(f.page, "Component bank")).click();
    await f.page.getByRole("searchbox", { name: "Find component", exact: true }).fill("transient");
    const trigger = f.page.locator('[data-view-item="specimen:transient:locked"]').getByRole("button");
    await trigger.click();
    const dialog = f.page.getByRole("dialog", { name: "Diagnostic transient", exact: true });
    await dialog.waitFor();
    for (const action of await dialog.getByRole("button", { name: "Close", exact: true }).all()) assert.equal(await action.isDisabled(), true);
    await f.page.keyboard.press("Escape"); assert.ok(await dialog.isVisible());
    await f.page.mouse.click(2, 2); assert.ok(await dialog.isVisible());
    await dialog.getByRole("button", { name: "Close", exact: true }).last().waitFor();
    await dialog.getByRole("button", { name: "Close", exact: true }).last().click();
    await dialog.waitFor({ state: "hidden" }); await settle(f.page);
    assert.ok(await trigger.evaluate(node => node === document.activeElement));
  } finally { await f.close(); }
});
