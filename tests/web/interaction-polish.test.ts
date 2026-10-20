import assert from "node:assert/strict";
import test from "node:test";
import { mkdir } from "node:fs/promises";
import type { Locator, Page } from "playwright";
import { browserFixture, settleMotion } from "./fixture.ts";

async function catalog() {
  const f = await browserFixture();
  try {
    await f.page.getByRole("button", { name: "Renderer catalog", exact: true }).click();
    return f;
  } catch (error) { await f.close(); throw error; }
}
async function evidence(page: Page, name: string) {
  await settleMotion(page);
  await mkdir("artifacts/typed-bank", { recursive: true });
  await page.screenshot({ path: `artifacts/typed-bank/polish-${name}.png` });
}
async function clickOverlay(page: Page, dialog: Locator) {
  const box = (await dialog.boundingBox())!;
  assert.ok(box.x > 0, "this desktop fixture has exposed overlay to the left");
  const point = { x: box.x / 2, y: box.y + box.height / 2 };
  assert.equal(await page.evaluate(({ x, y }) =>
    document.elementFromPoint(x, y)?.classList.contains("scrim"), point), true);
  await page.mouse.click(point.x, point.y);
}

test("context facts are immediately visible, and each catalog opening restores its own trigger", { timeout: 30000 }, async () => {
  const f = await catalog();
  try {
    const trigger = f.page.locator('[data-specimen="context:available"]').getByRole("button");
    for (const closeWith of ["Escape", "button"] as const) {
      await trigger.focus(); await f.page.keyboard.press("Enter");
      const dialog = f.page.getByRole("dialog", { name: "Context specimen", exact: true });
      await settleMotion(f.page);
      assert.equal(await dialog.getByRole("button", { name: "Close panel", exact: true }).isVisible(), false,
        "desktop has no visible mobile drag grip");
      const content = dialog.locator('[data-composition="context"]');
      const facts = content.locator(".fact-row");
      assert.ok(await facts.count() > 0, "the fixture must exercise real context facts");
      for (const fact of await facts.all()) assert.equal(await fact.isVisible(), true,
        "reading facts requires no disclosure interaction");
      assert.equal(await content.locator('details, [data-slot^="collapsible"], [aria-expanded]').count(), 0,
        "context content must not hide facts behind an expansion control");
      assert.equal(await dialog.getByRole("button", { name: "Details", exact: true }).count(), 0);
      assert.equal(await dialog.getByRole("region", { name: "Actions", exact: true }).isVisible(), true);
      const action = content.locator('[data-piece="destination-row"]').first();
      await action.focus();
      assert.equal(await action.evaluate(node => node === document.activeElement), true);
      for (const fact of await facts.all()) assert.equal(await fact.isVisible(), true,
        "moving focus to an action must not change fact visibility");
      await evidence(f.page, `visible-context-${closeWith}`);
      if (closeWith === "Escape") await f.page.keyboard.press("Escape");
      else await dialog.locator('[data-surface-slot="bottom"]').getByRole("button", { name: "Close", exact: true }).click();
      await dialog.waitFor({ state: "hidden" });
      assert.equal(await trigger.evaluate(node => node === document.activeElement), true,
        "focus must return after both the first and second opening");
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("mobile keyboard focus outlines the grip bar, not its oversized hit target", { timeout: 30000 }, async () => {
  const f = await catalog();
  try {
    await f.page.setViewportSize({ width: 390, height: 844 });
    await f.page.locator('[data-specimen="transient:open"]').getByRole("button").click();
    await settleMotion(f.page);
    const grip = f.page.getByRole("dialog").getByRole("button", { name: "Close panel", exact: true });
    assert.equal(await grip.isVisible(), true);
    await f.page.keyboard.press("Tab"); await grip.focus();
    const styles = await grip.evaluate(node => {
      const bar = node.querySelector("span")!;
      const target = getComputedStyle(node), line = getComputedStyle(bar);
      return { focus: node.matches(":focus-visible"), targetOutline: target.outlineStyle,
        targetWidth: parseFloat(target.outlineWidth), targetShadow: target.boxShadow,
        barOutline: line.outlineStyle, barWidth: parseFloat(line.outlineWidth),
        target: node.getBoundingClientRect().toJSON(), bar: bar.getBoundingClientRect().toJSON() };
    });
    assert.equal(styles.focus, true);
    assert.ok(styles.targetOutline === "none" || styles.targetWidth === 0);
    assert.equal(styles.targetShadow, "none", "the transparent hit target must not gain a focus ring");
    assert.ok(styles.barOutline !== "none" && styles.barWidth > 0);
    assert.ok(styles.bar.width < styles.target.width && styles.bar.height < styles.target.height);
    await evidence(f.page, "mobile-grip-focus");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("a short drag springs back, but a slow 100px crossing dismisses before release", { timeout: 30000 }, async () => {
  const f = await catalog();
  try {
    await f.page.setViewportSize({ width: 390, height: 844 });
    await f.page.emulateMedia({ reducedMotion: "no-preference" });
    await f.page.locator('[data-specimen="transient:open"]').getByRole("button").click();
    const dialog = f.page.getByRole("dialog", { name: "Transient specimen", exact: true });
    await settleMotion(f.page);
    const box = (await dialog.getByRole("button", { name: "Close panel", exact: true }).boundingBox())!;
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await f.page.mouse.move(x, y); await f.page.mouse.down();
    await f.page.mouse.move(x, y + 45, { steps: 5 });
    await f.page.waitForFunction(() => {
      const node = document.querySelector('[data-composition="transient"]');
      return node && new DOMMatrix(getComputedStyle(node).transform).m42 > 0;
    });
    await f.page.mouse.up();
    await f.page.waitForFunction(() => {
      const node = document.querySelector('[data-composition="transient"]');
      return node && Math.abs(new DOMMatrix(getComputedStyle(node).transform).m42) < 1;
    });
    assert.equal(await dialog.isVisible(), true);
    await evidence(f.page, "short-drag-return");
    await f.page.mouse.move(x, y); await f.page.mouse.down();
    try {
      for (const distance of [20, 40, 60, 80, 99]) {
        await f.page.mouse.move(x, y + distance);
        await f.page.waitForTimeout(80); // Slow movement must not depend on a release/velocity shortcut.
        assert.equal(await dialog.isVisible(), true, "below 100px the drawer stays open");
      }
      await f.page.mouse.move(x, y + 101);
      await dialog.waitFor({ state: "hidden" }); // Deliberately asserted while the pointer is still down.
    } finally { await f.page.mouse.up(); }
    await evidence(f.page, "threshold-dismissed");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("overlay click dismisses unlocked surfaces and cannot dismiss a locked transient", { timeout: 30000 }, async () => {
  const f = await catalog();
  try {
    for (const specimen of ["problem:error", "problem:warning", "transient:open"]) {
      await f.page.locator(`[data-specimen="${specimen}"]`).getByRole("button").click();
      const dialog = f.page.getByRole("dialog");
      await settleMotion(f.page);
      await clickOverlay(f.page, dialog);
      await dialog.waitFor({ state: "hidden" });
    }
    await f.page.locator('[data-specimen="transient:locked"]').getByRole("button").click();
    const dialog = f.page.getByRole("dialog");
    await settleMotion(f.page); await clickOverlay(f.page, dialog); await settleMotion(f.page);
    assert.equal(await dialog.isVisible(), true);
    await f.page.keyboard.press("Escape"); await settleMotion(f.page);
    assert.equal(await dialog.isVisible(), true);
    await evidence(f.page, "locked-overlay");
    await dialog.getByRole("button", { name: "Finish specimen operation", exact: true }).click();
    await clickOverlay(f.page, dialog); await dialog.waitFor({ state: "hidden" });
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("Problem has real type hierarchy and readiness uses the positive semantic color", { timeout: 30000 }, async () => {
  const f = await catalog();
  try {
    for (const colorScheme of ["light", "dark"] as const) {
      await f.page.emulateMedia({ colorScheme });
      const icon = f.page.locator('[data-specimen="availability:ready"] svg');
      assert.equal(await icon.evaluate(node => {
        const probe = document.createElement("span"); probe.style.color = "var(--positive)";
        node.parentElement!.append(probe);
        const same = getComputedStyle(node).color === getComputedStyle(probe).color;
        probe.remove(); return same;
      }), true, `ready icon follows --positive in ${colorScheme}`);
      for (const severity of ["error", "warning"]) {
        await f.page.locator(`[data-specimen="problem:${severity}"]`).getByRole("button").click();
        const dialog = f.page.getByRole("dialog");
        const type = await dialog.evaluate(node => {
          const title = node.querySelector('[data-slot="dialog-title"]')!;
          const description = node.querySelector('[data-slot="dialog-description"]')!;
          const heading = getComputedStyle(title), body = getComputedStyle(description);
          return { titleSize: parseFloat(heading.fontSize), bodySize: parseFloat(body.fontSize),
            titleWeight: parseFloat(heading.fontWeight), bodyWeight: parseFloat(body.fontWeight) };
        });
        assert.ok(type.titleSize > type.bodySize, "title is measurably larger than description");
        assert.ok(type.titleWeight > type.bodyWeight, "title is measurably bolder than description");
        await evidence(f.page, `problem-${severity}-${colorScheme}`);
        await clickOverlay(f.page, dialog); await dialog.waitFor({ state: "hidden" });
      }
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
