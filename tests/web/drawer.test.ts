import assert from "node:assert/strict";
import test from "node:test";
import AxeBuilder from "@axe-core/playwright";
import { browserFixture, settleMotion } from "./fixture.ts";

test("creation closes its transient before the saved object is read nonmodally", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await f.page.getByRole("button", { name: "Create note", exact: true }).click();
    const old = await f.page.getByRole("dialog").elementHandle();
    await f.page.getByRole("textbox", { name: "Title", exact: true }).fill("Separate surfaces");
    await f.page.getByRole("textbox", { name: "Content", exact: true }).fill("One identity per transient.");
    await f.page.locator("form").getByRole("button", { name: "Create note", exact: true }).click();
    await f.page.getByRole("region", { name: "Object context", exact: true }).waitFor();
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
    await f.page.getByRole("button", { name: "Renderer catalog", exact: true }).click();
    const trigger = f.page.locator('[data-specimen="transient:open"]').getByRole("button");
    await trigger.click();
    const dialog = f.page.getByRole("dialog", { name: "Transient specimen", exact: true });
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
    await f.page.locator('[data-specimen="transient:locked"]').getByRole("button").click();
    assert.equal(await dialog.evaluate(node => getComputedStyle(node).animationName), "none");
    await f.page.keyboard.press("Escape");
    assert.equal(await dialog.isVisible(), true);
    for (const slot of ["top", "bottom"]) {
      assert.equal(await dialog.locator(`[data-surface-slot="${slot}"]`).getByRole("button", { name: "Close", exact: true }).isDisabled(), true);
    }
    await dialog.getByRole("button", { name: "Finish specimen operation" }).click();
    await dialog.locator('[data-surface-slot="top"]').getByRole("button", { name: "Close", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    assert.equal(await f.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
