import assert from "node:assert/strict";
import test from "node:test";
import { mkdir } from "node:fs/promises";
import type { Locator, Page } from "playwright";
import { activePanel, settleMotion, waitForNote } from "./fixture.ts";
import { inspectionFixture as browserFixture, openCatalog } from "./inspection-fixture.ts";

async function catalog() {
  const f = await browserFixture();
  try {
    await openCatalog(f.page);
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

test("published object facts are immediately visible and each opening restores its own trigger", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    const run = await f.session.begin("create-note");
    const prepared = await f.session.prepare(run.id, { title: "Context witness", body: "Visible without disclosure." });
    await f.session.accept(prepared.id, prepared.confirmationDigest);
    await f.page.reload();
    const trigger = f.page.getByRole("button", { name: /Context witness/ });
    for (const closeWith of ["Escape", "button"] as const) {
      await trigger.focus(); await f.page.keyboard.press("Enter");
      const dialog = activePanel(f.page);
      await waitForNote(f.page, "Context witness");
      assert.equal(await dialog.getByRole("button", { name: "Close panel", exact: true }).isVisible(), false,
        "desktop has no visible mobile drag grip");
      const content = dialog.locator('[data-surface-slot="content"]');
      const facts = content.locator(".fact-row");
      assert.ok(await facts.count() > 0, "the fixture must exercise real context facts");
      for (const fact of await facts.all()) assert.equal(await fact.isVisible(), true,
        "reading facts requires no disclosure interaction");
      assert.equal(await content.locator('details, [data-slot^="collapsible"], [aria-expanded]').count(), 0,
        "context content must not hide facts behind an expansion control");
      assert.equal(await dialog.getByRole("button", { name: "Details", exact: true }).count(), 0);
      const action = dialog.locator('[data-surface-slot="top"]').getByRole("button", { name: "Archive note", exact: true });
      assert.equal(await action.isVisible(), true);
      await action.focus();
      assert.equal(await action.evaluate(node => node === document.activeElement), true);
      for (const fact of await facts.all()) assert.equal(await fact.isVisible(), true,
        "moving focus to an action must not change fact visibility");
      await evidence(f.page, `visible-context-${closeWith}`);
      if (closeWith === "Escape") await f.page.keyboard.press("Escape");
      else await dialog.locator('[data-surface-slot="top"]').getByRole("button", { name: "Close", exact: true }).click();
      await dialog.waitFor({ state: "hidden" });
      assert.equal(await trigger.evaluate(node => node === document.activeElement), true,
        "focus must return after both the first and second opening");
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("mobile grip keeps shared button keyboard focus and a generous target around its small mark", { timeout: 30000 }, async () => {
  const f = await catalog();
  try {
    await f.page.setViewportSize({ width: 390, height: 844 });
    await f.page.locator('[data-view-item="specimen:transient:open"]').getByRole("button").click();
    await settleMotion(f.page);
    const grip = f.page.getByRole("dialog").getByRole("button", { name: "Close panel", exact: true });
    assert.equal(await grip.isVisible(), true);
    await f.page.keyboard.press("Tab"); await grip.focus();
    const styles = await grip.evaluate(node => {
      const bar = node.querySelector("[data-drawer-grip-mark]")!;
      const target = getComputedStyle(node), line = getComputedStyle(bar);
      return { focus: node.matches(":focus-visible"), targetOutline: target.outlineStyle,
        targetWidth: parseFloat(target.outlineWidth), targetShadow: target.boxShadow,
        barOutline: line.outlineStyle, barWidth: parseFloat(line.outlineWidth),
        target: node.getBoundingClientRect().toJSON(), bar: bar.getBoundingClientRect().toJSON() };
    });
    assert.equal(styles.focus, true);
    assert.ok(styles.targetOutline !== "none" && styles.targetWidth > 0,
      "the grip remains a shared button with a visible keyboard focus boundary");
    assert.ok(styles.target.height >= 44 && styles.target.width >= 44);
    assert.ok(styles.bar.width < styles.target.width && styles.bar.height < styles.target.height);
    await evidence(f.page, "mobile-grip-focus");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("a drag stays reversible while held, springs back on cancellation and dismisses on release", { timeout: 30000 }, async () => {
  const f = await catalog();
  try {
    await f.page.setViewportSize({ width: 390, height: 844 });
    await f.page.emulateMedia({ reducedMotion: "no-preference" });
    await f.page.locator('[data-view-item="specimen:transient:open"]').getByRole("button").click();
    const dialog = f.page.getByRole("dialog", { name: "Diagnostic transient", exact: true });
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
      await f.page.mouse.move(x, y + 140);
      assert.equal(await dialog.isVisible(), true, "crossing the distance threshold does not commit while held");
      await f.page.mouse.move(x, y + 20); // The user can reverse the held gesture before committing it.
    } finally { await f.page.mouse.up(); }
    await settleMotion(f.page);
    assert.equal(await dialog.isVisible(), true, "reversing below the threshold cancels dismissal");
    await f.page.mouse.move(x, y); await f.page.mouse.down();
    await f.page.mouse.move(x, y + 140, { steps: 8 }); await f.page.mouse.up();
    await dialog.waitFor({ state: "hidden" });
    await evidence(f.page, "threshold-dismissed");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("overlay click dismisses unlocked surfaces and cannot dismiss a locked transient", { timeout: 30000 }, async () => {
  const f = await catalog();
  try {
    for (const specimen of ["problem:error", "problem:warning", "transient:open"]) {
      await f.page.locator(`[data-view-item="specimen:${specimen}"]`).getByRole("button").click();
      const dialog = f.page.getByRole("dialog");
      await settleMotion(f.page);
      await clickOverlay(f.page, dialog);
      await dialog.waitFor({ state: "hidden" });
    }
    await f.page.locator('[data-view-item="specimen:transient:locked"]').getByRole("button").click();
    const dialog = f.page.getByRole("dialog");
    await settleMotion(f.page); await clickOverlay(f.page, dialog); await settleMotion(f.page);
    assert.equal(await dialog.isVisible(), true);
    await f.page.keyboard.press("Escape"); await settleMotion(f.page);
    assert.equal(await dialog.isVisible(), true);
    await evidence(f.page, "locked-overlay");
    await dialog.locator('[data-surface-slot="top"]').getByRole("button", { name: "Close", exact: true }).and(f.page.locator(':enabled')).waitFor();
    await clickOverlay(f.page, dialog); await dialog.waitFor({ state: "hidden" });
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("Problem has real type hierarchy and readiness uses the positive semantic color", { timeout: 30000 }, async () => {
  const f = await catalog();
  try {
    for (const colorScheme of ["light", "dark"] as const) {
      await f.page.emulateMedia({ colorScheme });
      const icon = f.page.locator('[data-view-item="specimen:availability:ready"] svg');
      assert.equal(await icon.evaluate(node => {
        const probe = document.createElement("span"); probe.style.color = "var(--positive)";
        node.parentElement!.append(probe);
        const same = getComputedStyle(node).color === getComputedStyle(probe).color;
        probe.remove(); return same;
      }), true, `ready icon follows --positive in ${colorScheme}`);
      for (const severity of ["error", "warning"]) {
        await f.page.locator(`[data-view-item="specimen:problem:${severity}"]`).getByRole("button").click();
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
