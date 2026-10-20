import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Locator } from "playwright";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { settleMotion } from "./web/fixture.ts";

// The compact grip is an enabled Close action as well as a drag handle. Its
// unchanged position while held must still have visible non-motion feedback.
const directory = resolve("artifacts/hover-consistency", process.env.DESERT_HOVER_PHASE ?? "source");
async function snapshot(grip: Locator, name: string) {
  const png = await grip.screenshot({ path: resolve(directory, `${name}.png`), animations: "disabled" });
  return { paint: createHash("sha256").update(png).digest("hex"),
    appearance: await grip.evaluate(element => {
      const style = getComputedStyle(element), box = element.getBoundingClientRect();
      return { background: style.backgroundImage, fill: style.backgroundColor, hovered: element.matches(":hover"),
        pressed: element.getAttribute("data-pressed"), box: { x: box.x, y: box.y, width: box.width, height: box.height } };
    }) };
}

async function drawerFixture(locked = false) {
  return svelteBrowser(`<script lang="ts">
    import Drawer from '@desert/svelte/pieces/Drawer.svelte';
    import { SurfaceFrameVersion } from '@desert/interaction/surface-frame.ts';
    let open = $state(false);
    const frame = {version:SurfaceFrameVersion,kind:'specimen',top:{title:'Context'},
      content:{kind:'information',items:[{kind:'text',text:'A compact source-only feedback specimen.'}]},bottom:{}};
  </script><main data-surface-host><button onclick={()=>open=true}>Open context</button>
    <Drawer label="Context" {frame} {open} locked={${locked}} onclose={()=>open=false} invoke={()=>{}} /></main>`);
}

for (const theme of ["light", "dark"] as const) test(`${theme}: compact drawer grip has visible hover and held feedback`, async () => {
  const fixture = await drawerFixture();
  const name = `drawer-source-${theme}`;
  try {
    const { page } = fixture;
    await mkdir(directory, { recursive: true });
    await page.setViewportSize({ width: 390, height: 740 });
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await page.addStyleTag({ content: await rendererCss() });
    await page.getByRole("button", { name: "Open context", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Context", exact: true });
    const grip = dialog.getByRole("button", { name: "Close panel", exact: true });
    await grip.waitFor(); await page.mouse.move(0, 0);
    const normal = await snapshot(grip, `${name}-normal`);
    await grip.hover(); const hover = await snapshot(grip, `${name}-hover`);
    await page.mouse.down(); const held = await snapshot(grip, `${name}-held`);
    await page.mouse.up(); await dialog.waitFor({ state: "hidden" });
    const failures = [];
    if (!hover.appearance.hovered) failures.push("Pointer must enter the enabled grip");
    if (normal.paint === hover.paint) failures.push("Grip hover must visibly change its paint");
    if (hover.paint === held.paint) failures.push("Held grip must visibly differ from hover without moving");
    for (const state of [hover, held]) if (JSON.stringify(state.appearance.box) !== JSON.stringify(normal.appearance.box))
      failures.push("Grip hit geometry must stay fixed");
    await writeFile(resolve(directory, `${name}.json`), JSON.stringify({ sourceOnly: true, theme, reducedMotion: true,
      states: { normal, hover, held }, closedOnClick: true, errors: fixture.errors, failures }, null, 2) + "\n");
    assert.deepEqual(fixture.errors, []);
    assert.deepEqual(failures, [], failures.join("; "));
  } finally { await fixture.page.mouse.up().catch(() => {}); await fixture.close(); }
});

async function dragState(dialog: Locator) {
  return dialog.evaluate(element => {
    const grip = element.querySelector<HTMLButtonElement>('[aria-label="Close panel"]')!;
    return { offset: new DOMMatrix(getComputedStyle(element).transform).m42,
      pressed: grip.getAttribute("data-pressed"), disabled: grip.disabled };
  });
}

// Same native-pointer interaction under both motion preferences: feedback must
// not replace or swallow the grip gesture. Crossing the threshold stays reversible
// while held; release is the moment that commits dismissal.
for (const motion of ["no-preference", "reduce"] as const)
  test(`${motion}: compact grip drag snaps back and commits past the threshold on release`, async () => {
    const fixture = await drawerFixture();
    const name = `drawer-source-drag-${motion}`;
    try {
      const { page } = fixture;
      await mkdir(directory, { recursive: true });
      await page.setViewportSize({ width: 390, height: 740 });
      await page.emulateMedia({ colorScheme: "dark", reducedMotion: motion });
      await page.addStyleTag({ content: await rendererCss() });
      await page.getByRole("button", { name: "Open context", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "Context", exact: true });
      const grip = dialog.getByRole("button", { name: "Close panel", exact: true });
      await grip.waitFor(); await settleMotion(page);
      const box = (await grip.boundingBox())!, x = box.x + box.width / 2, y = box.y + box.height / 2;
      const normal = await dragState(dialog);
      await page.mouse.move(x, y); await page.mouse.down();
      await page.mouse.move(x, y + 45, { steps: 5 });
      const dragging = await dragState(dialog);
      await grip.screenshot({ path: resolve(directory, `${name}-held.png`) });
      await page.mouse.up();
      await page.waitForFunction(() => {
        const panel = document.querySelector('[data-composition="transient"]');
        return panel && Math.abs(new DOMMatrix(getComputedStyle(panel).transform).m42) < .1;
      });
      const returned = await dragState(dialog);
      await grip.screenshot({ path: resolve(directory, `${name}-returned.png`) });
      await page.mouse.move(x, y); await page.mouse.down();
      const approach = [];
      for (const distance of [20, 60, 99]) {
        await page.mouse.move(x, y + distance, { steps: 3 });
        approach.push({ distance, visible: await dialog.isVisible(), state: await dragState(dialog) });
      }
      await page.mouse.move(x, y + 101);
      const openBeforeRelease = await dialog.isVisible();
      await page.mouse.up(); await dialog.waitFor({ state: "hidden" });
      // A reopened grip must not retain pressed state from the dismissed drag.
      await page.getByRole("button", { name: "Open context", exact: true }).click();
      await grip.waitFor(); await settleMotion(page);
      // Svelte Spring runs outside document.getAnimations(); await its real
      // resting offset, not only the completed CSS entry animation.
      await page.waitForFunction(() => {
        const panel = document.querySelector('[data-composition="transient"]');
        return panel && Math.abs(new DOMMatrix(getComputedStyle(panel).transform).m42) < .1;
      });
      const reopened = await dragState(dialog);
      await writeFile(resolve(directory, `${name}.json`), JSON.stringify({ sourceOnly: true, motion, normal,
        dragging, returned, approach, openBeforeRelease, reopened, errors: fixture.errors }, null, 2) + "\n");
      assert.ok(Math.abs(dragging.offset - 45) < 1, "grip drag moves the panel by pointer distance");
      assert.equal(dragging.pressed, "pointer");
      assert.ok(Math.abs(returned.offset) < .1, "sub-threshold release returns to resting position");
      assert.equal(returned.pressed, null, "release clears shared held feedback");
      assert.ok(approach.every(step => step.visible), "sub-threshold movement must not dismiss");
      assert.ok(openBeforeRelease, "crossing 100px must remain reversible until release");
      assert.ok(Math.abs(reopened.offset) < .1); assert.equal(reopened.pressed, null);
      assert.deepEqual(fixture.errors, []);
    } finally { await fixture.page.mouse.up().catch(() => {}); await fixture.close(); }
  });

for (const theme of ["light", "dark"] as const)
  test(`${theme}: locked compact grip stays disabled under pointer, keyboard, and outside dismissal`, async () => {
    const fixture = await drawerFixture(true);
    const name = `drawer-source-locked-${theme}`;
    try {
      const { page } = fixture;
      await mkdir(directory, { recursive: true });
      await page.setViewportSize({ width: 390, height: 740 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.addStyleTag({ content: await rendererCss() });
      await page.getByRole("button", { name: "Open context", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "Context", exact: true });
      const grip = dialog.getByRole("button", { name: "Close panel", exact: true });
      await grip.waitFor(); await page.mouse.move(0, 0);
      const normal = await snapshot(grip, `${name}-normal`), box = normal.appearance.box;
      const x = box.x + box.width / 2, y = box.y + box.height / 2;
      // Coordinates intentionally bypass Playwright's enabled-action guard so
      // the real browser, not the harness, rejects the disabled interaction.
      await page.mouse.move(x, y); const hover = await snapshot(grip, `${name}-hover`);
      await page.mouse.down(); const held = await snapshot(grip, `${name}-held`);
      await page.mouse.move(x, y + 120, { steps: 8 }); await page.mouse.up();
      const afterDrag = await dragState(dialog);
      await grip.focus(); const focused = await grip.evaluate(element => document.activeElement === element);
      await page.keyboard.press("Enter"); await page.keyboard.press("Space"); await page.keyboard.press("Escape");
      await page.mouse.click(0, 0); await settleMotion(page);
      const visible = await dialog.isVisible();
      await writeFile(resolve(directory, `${name}.json`), JSON.stringify({ sourceOnly: true, theme,
        normal, hover, held, afterDrag, focused, visible, errors: fixture.errors }, null, 2) + "\n");
      assert.equal(await grip.isDisabled(), true); assert.equal(focused, false);
      assert.equal(normal.paint, hover.paint, "disabled grip must not imply hover availability");
      assert.equal(hover.paint, held.paint, "disabled grip must not imply a held action");
      assert.equal(afterDrag.pressed, null); assert.equal(afterDrag.offset, 0);
      assert.equal(visible, true, "locked panel must reject pointer, keyboard, and outside dismissal");
      assert.deepEqual(fixture.errors, []);
    } finally { await fixture.page.mouse.up().catch(() => {}); await fixture.close(); }
  });
