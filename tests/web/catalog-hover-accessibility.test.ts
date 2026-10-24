import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import type { Locator, Page } from "playwright";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { action, navigationAction, readOnlyRequests, settle } from "./public-catalog-expectations.ts";
import { observeDiagnostics } from "./public-catalog-diagnostics.ts";

const directory = resolve("artifacts/hover-consistency", process.env.DESERT_HOVER_PHASE ??
  basename(process.env.DESERT_CATALOG_BUILD ?? "unknown-build"), "accessibility");
const paint = (control: Locator) => control.evaluate(element => {
  const s = getComputedStyle(element), child = element.querySelector("[data-button-content]");
  return { overlay: s.backgroundImage, background: s.backgroundColor, backdrop: s.backdropFilter,
    transform: s.transform, content: child ? getComputedStyle(child).transform : null,
    pressed: element.getAttribute("data-pressed"), focus: element.matches(":focus-visible"),
    outline: s.outlineStyle, outlineWidth: s.outlineWidth };
});
async function evidence(page: Page, name: string, values: unknown) {
  await mkdir(directory, { recursive: true });
  await writeFile(resolve(directory, `${name}.json`), JSON.stringify(values, null, 2) + "\n");
  await page.screenshot({ path: resolve(directory, `${name}.png`), animations: "disabled", caret: "hide" });
}
async function pointerStates(page: Page, control: Locator, held = true) {
  await page.mouse.move(1090, 740); await settle(page); const normal = await paint(control);
  await control.hover(); await settle(page); const hover = await paint(control);
  if (held) await page.mouse.down(); await settle(page); const down = await paint(control);
  await page.mouse.move(1090, 740); await settle(page); const cancelled = await paint(control);
  await page.mouse.up(); return { normal, hover, down, cancelled };
}

for (const preference of ["prefers-reduced-transparency", "prefers-contrast"]) {
  test(`${preference}: opaque search material preserves hover and held feedback`, async () => {
    const f = await publicCatalogFixture(), cdp = await f.context.newCDPSession(f.page);
    try {
      await f.page.setViewportSize({ width: 1100, height: 760 });
      await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: preference,
        value: preference === "prefers-contrast" ? "more" : "reduce" }] });
      await settle(f.page);
      const closed = await pointerStates(f.page, action(f.page, "Search"));
      await action(f.page, "Search").click(); await settle(f.page);
      const open = await pointerStates(f.page, action(f.page, "Close search"));
      const well = await pointerStates(f.page, f.page.locator('[data-catalog-search] [data-slot="input-group"]'), false);
      await evidence(f.page, preference, { closed, open, well });
      for (const state of [closed, open, well]) {
        assert.equal(state.normal.backdrop, "none", "Accessibility material is opaque, not blurred");
        assert.notEqual(state.hover.overlay, state.normal.overlay, "Fallback material must not erase hover");
        assert.equal(state.hover.background, state.normal.background);
        assert.equal(state.cancelled.overlay, state.normal.overlay);
      }
      for (const state of [closed, open]) assert.notEqual(state.down.overlay, state.hover.overlay);
    } finally { await cdp.detach(); await f.close(); }
  });
}

test("reduced motion retains search and navigation paint without content compression", async () => {
  const f = await publicCatalogFixture();
  try {
    await f.page.setViewportSize({ width: 1100, height: 760 });
    await f.page.emulateMedia({ reducedMotion: "reduce" }); await settle(f.page);
    const controls = [action(f.page, "Search"), f.page.locator('[data-slot="sidebar-menu-button"][data-active="true"]')];
    for (const [index, control] of controls.entries()) {
      const states = await pointerStates(f.page, control);
      await evidence(f.page, `reduced-motion-${index}`, states);
      assert.notEqual(states.hover.overlay, states.normal.overlay);
      assert.notEqual(states.down.overlay, states.hover.overlay);
      assert.equal(states.down.transform, "none"); assert.equal(states.down.content, "none");
      assert.equal(states.cancelled.overlay, states.normal.overlay);
    }
  } finally { await f.close(); }
});

test("keyboard navigation has unclipped focus and cancels a held Space on focus departure", async () => {
  const f = await publicCatalogFixture();
  try {
    await f.page.setViewportSize({ width: 1100, height: 760 }); await settle(f.page);
    const current = await f.page.locator("[data-catalog-content]").getAttribute("data-destination");
    const failures: string[] = [];
    for (const selected of [true, false]) {
      const control = f.page.locator(`[data-slot="sidebar-menu-button"]${selected ? '[data-active="true"]' : ':not([data-active="true"])'}`).first();
      await f.page.keyboard.press("Tab"); await control.focus(); await settle(f.page);
      const focused = await paint(control);
      const clipping = await control.evaluate(element => {
        const s = getComputedStyle(element), r = element.getBoundingClientRect();
        const extent = Math.max(0, parseFloat(s.outlineWidth) + parseFloat(s.outlineOffset));
        const clipped: string[] = [];
        for (let parent = element.parentElement; parent; parent = parent.parentElement) {
          const p = getComputedStyle(parent), b = parent.getBoundingClientRect();
          if (/(hidden|clip|auto|scroll)/.test(p.overflowY) && (r.top - extent < b.top - .5 || r.bottom + extent > b.bottom + .5))
            clipped.push(parent.getAttribute("data-slot") ?? parent.tagName);
        }
        return clipped;
      });
      await f.page.keyboard.down("Space"); await settle(f.page); const held = await paint(control);
      await evidence(f.page, `keyboard-${selected ? "selected" : "unselected"}`, { focused, held, clipping });
      await action(f.page, "Search").focus(); await f.page.keyboard.up("Space"); await settle(f.page);
      const cancelled = await paint(control);
      if (!focused.focus || focused.outline !== "solid" || focused.outlineWidth !== "2px") failures.push(`${selected}: missing keyboard outline`);
      if (clipping.length) failures.push(`${selected}: focus clipped by ${clipping.join(", ")}`);
      if (held.pressed !== "keyboard" || held.overlay === focused.overlay) failures.push(`${selected}: missing keyboard held feedback`);
      if (cancelled.pressed !== null || cancelled.overlay !== focused.overlay || cancelled.content !== focused.content) failures.push(`${selected}: blur did not cancel feedback`);
    }
    assert.equal(await f.page.locator("[data-catalog-content]").getAttribute("data-destination"), current);
    assert.deepEqual(failures, []);
  } finally { await f.page.keyboard.up("Space").catch(() => {}); await f.close(); }
});

test("touch-only catalog never acquires hover but retains cancellable touch feedback", async () => {
  const f = await publicCatalogFixture();
  const context = await f.browser.newContext({ viewport: { width: 402, height: 874 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  try {
    const page = await context.newPage(), diagnostics = observeDiagnostics(page), readonly = readOnlyRequests(page);
    await page.goto(f.origin); await settle(page);
    assert.equal(await page.evaluate(() => matchMedia("(hover: hover)").matches), false);
    const control = action(page, "Search"), normal = await paint(control);
    await control.hover(); const hovered = await paint(control), box = (await control.boundingBox())!;
    const cdp = await context.newCDPSession(page);
    try {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }] });
      const held = await paint(control);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
      const cancelled = await paint(control);
      await evidence(page, "touch-only", { normal, hovered, held, cancelled, limitation: "Chromium emulation, not physical-device qualification" });
      assert.equal(hovered.overlay, normal.overlay); assert.notEqual(held.overlay, normal.overlay);
      assert.equal(cancelled.overlay, normal.overlay); assert.equal(cancelled.pressed, null);
      assert.equal(await control.getAttribute("aria-expanded"), "false", "Cancellation does not activate search");
    } finally { await cdp.detach(); }
    readonly(); diagnostics.assertClean();
  } finally { await context.close(); await f.close(); }
});

test("unavailable and pending catalog actions cannot acquire feedback or keyboard focus", async () => {
  const f = await publicCatalogFixture();
  try {
    await f.page.setViewportSize({ width: 1100, height: 760 });
    await (await navigationAction(f.page, "Component bank")).click(); await settle(f.page);
    for (const state of ["unavailable", "pending"]) {
      const control = f.page.locator(`[data-view-item="specimen:action:${state}"] button`);
      await control.scrollIntoViewIfNeeded(); await f.page.mouse.move(1090, 740); await settle(f.page);
      assert.equal(await control.isDisabled(), true); const normal = await paint(control), box = (await control.boundingBox())!;
      await f.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await f.page.mouse.down();
      const held = await paint(control); await f.page.mouse.up();
      await evidence(f.page, `disabled-${state}`, { normal, held });
      assert.equal(held.overlay, normal.overlay); assert.equal(held.pressed, null); assert.equal(held.content, normal.content);
      assert.equal(await control.evaluate(element => { (element as HTMLElement).focus(); return element === document.activeElement; }), false);
      assert.equal(await control.locator("xpath=ancestor::article").getByRole("status").count(), 0);
    }
  } finally { await f.page.mouse.up().catch(() => {}); await f.close(); }
});
