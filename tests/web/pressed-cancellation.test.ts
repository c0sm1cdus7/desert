import assert from "node:assert/strict";
import test from "node:test";
import type { Locator, Page } from "playwright";
import { settleMotion } from "./fixture.ts";
import { appearance, catalog, evidence, finishTarget, target, openNotes } from "./press-fixture.ts";
import { openCatalog } from "./inspection-fixture.ts";
import { panelToolbar } from "./fixture.ts";

async function idle(page: Page, button: Locator, before: Awaited<ReturnType<typeof appearance>>, held?: string) {
  await settleMotion(page);
  const after = await appearance(button);
  assert.equal(after.transform, "none"); assert.equal(after.contentScale, 1, "cancelled/disabled content must not compress");
  assert.equal(after.background, before.background); assert.equal(after.color, before.color);
  for (const dimension of ["x", "y", "width", "height"] as const)
    assert.ok(Math.abs(after.box[dimension] - before.box[dimension]) <= .1, `fixed ${dimension}`);
  if (held !== undefined) assert.notEqual(after.overlay, held, "cancellation must clear held surface feedback");
  else assert.equal(after.overlay, before.overlay, "disabled controls must not acquire press or hover feedback");
  return after;
}
async function compressed(page: Page, button: Locator) {
  await settleMotion(page);
  const pressed = await appearance(button);
  assert.ok(pressed.contentScale !== null && Math.abs(pressed.contentScale - .96) < .001,
    "the test must establish a real held state before cancelling it");
  return pressed;
}

for (const theme of ["light", "dark"] as const) {
  test(`${theme}: pointer-out, touch-cancel, keyboard blur and disabled controls cannot retain pressed feedback`, { timeout: 30000 }, async () => {
    const f = await catalog();
    const touch = await f.page.context().newCDPSession(f.page);
    try {
      await f.page.emulateMedia({ colorScheme: theme }); await settleMotion(f.page);
      assert.equal(await f.page.evaluate(() => getComputedStyle(document.documentElement).colorScheme), theme);
      for (const name of ["neutral", "primary", "middle-row"] as const) {
        const button = await target(f.page, name);
        const clicks = await button.evaluateHandle(element => {
          const state = { count: 0 }; element.addEventListener("click", () => state.count++); return state;
        });
        await button.scrollIntoViewIfNeeded(); await f.page.mouse.move(0, 0); await settleMotion(f.page);
        const before = await appearance(button), box = before.box;
        const previousFocus = name === "middle-row" ? f.page.getByRole("button", { name: "Create note", exact: true })
          : panelToolbar(f.page, "top").getByRole("button", { name: "Close", exact: true });
        await previousFocus.focus();
        assert.equal(await previousFocus.evaluate(element => element === document.activeElement), true);
        await button.hover(); await f.page.mouse.down();
        let pointerOut;
        try {
          assert.equal(await button.evaluate(element => element === document.activeElement), true,
            "native pointer down moves focus from another control without cancelling held feedback");
          const held = await compressed(f.page, button);
          await f.page.mouse.move(box.x + 2, box.y + box.height / 2);
          await compressed(f.page, button); // Crossing child content inside the same hit target must not cancel it.
          await f.page.mouse.move(0, 0); // Still down: no release or click should be needed to cancel the visual press.
          pointerOut = await idle(f.page, button, before, held.overlay);
          assert.equal(pointerOut.overlay, before.overlay, "outside the target there is no hover or press treatment");
          await button.hover();
          await compressed(f.page, button); // The same unreleased pointer still owns the gesture on re-entry.
          await f.page.mouse.move(0, 0);
          await idle(f.page, button, before, held.overlay); // Release outside cancels activation after re-entry.
        } finally { await f.page.mouse.up(); }
        await idle(f.page, button, before);
        assert.equal(await clicks.evaluate(state => state.count), 0, "leaving, re-entering and releasing outside must not activate");

        await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }] });
        const touchHeld = await compressed(f.page, button);
        await touch.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
        const cancelled = await idle(f.page, button, before, touchHeld.overlay);
        assert.equal(await clicks.evaluate(state => state.count), 0, "native touch cancellation must not activate");

        await button.focus(); await f.page.keyboard.down("Enter");
        let blurred;
        try {
          const keyHeld = await compressed(f.page, button);
          await button.evaluate(element => (element as HTMLElement).blur());
          blurred = await idle(f.page, button, before, keyHeld.overlay);
        } finally { await f.page.keyboard.up("Enter"); }
        assert.equal(await clicks.evaluate(state => state.count), 1, "native Enter still activates exactly once");
        await clicks.dispose();
        await evidence(f.page, `cancelled-${theme}-${name}`, { before, pointerOut, cancelled, blurred });
        await finishTarget(f.page);
      }

      const disabled = async (button: Locator, name: string) => {
        await button.scrollIntoViewIfNeeded(); await f.page.mouse.move(0, 0); await settleMotion(f.page);
        assert.equal(await button.isDisabled(), true);
        assert.equal(await button.evaluate(element => { (element as HTMLElement).focus(); return element === document.activeElement; }), false,
          "native disabled buttons cannot receive keyboard focus");
        const before = await appearance(button), box = before.box;
        await f.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await f.page.mouse.down();
        try { await evidence(f.page, `disabled-${theme}-${name}`, { before, held: await idle(f.page, button, before) }); }
        finally { await f.page.mouse.up(); }
      };
      await openCatalog(f.page);
      await disabled(f.page.locator('[data-specimen="action:unavailable"] button'), "action");
      await disabled(f.page.locator('[data-specimen="control.select:disabled"] [data-selection-trigger]'), "selection");
      await openNotes(f.page);
      const rows = f.page.locator('[data-list] [data-row-leading="attention"]:visible');
      for (const index of [0, 1, 2]) {
        // Exercise native disabled paint on the same real row, without claiming controller availability.
        await rows.nth(index).evaluate(node => { (node as HTMLButtonElement).disabled = true; });
        await disabled(rows.nth(index), `row-${index}`);
      }
    } finally { await touch.detach(); await f.close(); }
  });
}
