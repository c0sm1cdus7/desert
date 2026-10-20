import test from "node:test";
import assert from "node:assert/strict";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { selectionTrigger, settle } from "./public-catalog-expectations.ts";
import { saveWellEvidence, selectionWell, wellAppearance, wellPoints } from "./field-well-expectations.ts";

test("label and value share content compression while the well silhouette stays fixed", async () => {
  const f = await publicCatalogFixture();
  try {
    const { page } = f; await page.setViewportSize({ width: 1280, height: 900 });
    const { well } = await selectionWell(page, "bank");
    const point = (await wellPoints(well)).label;
    await page.mouse.move(point.x, point.y); await settle(page); const rest = await wellAppearance(well);
    await page.mouse.down();
    try {
      await settle(page); const held = await wellAppearance(well);
      await saveWellEvidence(page, "shared-content-compression", { rest, held });
      for (const text of ["Single choice", "Not selected"]) {
        const before = rest.glyphs.find(glyph => glyph.text === text), after = held.glyphs.find(glyph => glyph.text === text);
        assert.ok(before && after, `Visible ${text} must participate in the same content layer`);
        assert.ok(Math.abs(after.width / before.width - .985) < .003, `${text} compresses with the canonical content scale`);
      }
      assert.equal(held.transform, "none", "Only contents move, never the border/hit target");
    } finally { await page.mouse.move(0, 0); await page.mouse.up(); }
  } finally { await f.close(); }
});

test("crossing label and value does not cancel; leaving and touch cancellation clear the entire well", async () => {
  const f = await publicCatalogFixture(), touch = await f.context.newCDPSession(f.page);
  try {
    const { page } = f; await page.setViewportSize({ width: 1280, height: 900 });
    const { well, trigger } = await selectionWell(page, "travel"), menu = page.getByRole("listbox");
    const initialValue = await trigger.innerText();
    const points = await wellPoints(well); await page.mouse.move(0, 0); await settle(page);
    const rest = await wellAppearance(well);
    await page.mouse.move(points.value.x, points.value.y); await page.mouse.down();
    try {
      await settle(page); const held = await wellAppearance(well);
      assert.ok(held.image !== rest.image || held.background !== rest.background, "The test establishes genuine whole-well feedback");
      assert.equal(await menu.isVisible(), true, "The installed shadcn select opens on native mouse pointerdown");
      for (const point of [points.label, points["top padding"], points.chevron]) {
        await page.mouse.move(point.x, point.y); await settle(page);
        const crossed = await wellAppearance(well);
        assert.equal(crossed.image, held.image, "A single native hit target includes all children and padding");
      }
      await page.mouse.move(0, 0); await settle(page);
      const outside = await wellAppearance(well);
      assert.equal(outside.image, rest.image); assert.equal(outside.background, rest.background);
    } finally { await page.mouse.up(); }
    assert.equal(await trigger.innerText(), initialValue, "Dragging away from the trigger must not commit a highlighted option");
    await page.keyboard.press("Escape"); await menu.waitFor({ state: "hidden" });
    await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: points.label.x, y: points.label.y }] });
    await settle(page); const heldTouch = await wellAppearance(well);
    assert.ok(heldTouch.image !== rest.image || heldTouch.background !== rest.background, "Touching the label presses the whole well");
    await touch.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] }); await settle(page);
    const cancelled = await wellAppearance(well);
    assert.equal(cancelled.image, rest.image); assert.equal(cancelled.background, rest.background);
    assert.equal(await menu.isVisible(), false);
    assert.equal(await trigger.innerText(), initialValue);
    await saveWellEvidence(page, "gesture-cancellation", { rest, heldTouch, cancelled });
  } finally { await touch.detach(); await f.close(); }
});

test("reduced motion preserves whole-well feedback without shrinking any text", async () => {
  const f = await publicCatalogFixture();
  try {
    const { page } = f; await page.setViewportSize({ width: 1280, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const { well } = await selectionWell(page, "bank"), point = (await wellPoints(well)).label;
    await page.mouse.move(point.x, point.y); await settle(page); const hover = await wellAppearance(well);
    await page.mouse.down();
    try {
      await settle(page); const held = await wellAppearance(well);
      assert.ok(held.image !== hover.image || held.background !== hover.background);
      assert.deepEqual(held.glyphs, hover.glyphs, "Reduced motion keeps every glyph at its resting size");
      assert.equal(held.transform, "none");
      await saveWellEvidence(page, "reduced-motion", { hover, held });
    } finally { await page.mouse.move(0, 0); await page.mouse.up(); }
  } finally { await f.close(); }
});

test("disabled selection ignores the whole well without hover, press or keyboard focus", async () => {
  const f = await publicCatalogFixture();
  try {
    const { page } = f; await page.setViewportSize({ width: 1280, height: 900 });
    await selectionWell(page, "bank");
    const trigger = selectionTrigger(page, "Disabled choice"), well = trigger.locator("xpath=ancestor-or-self::*[@data-floating-field][1]");
    await well.scrollIntoViewIfNeeded(); await page.mouse.move(0, 0); await settle(page);
    const rest = await wellAppearance(well); assert.equal(await trigger.isDisabled(), true);
    assert.equal(await trigger.evaluate(element => { (element as HTMLElement).focus(); return document.activeElement === element; }), false);
    for (const point of Object.values(await wellPoints(well))) {
      await page.mouse.move(point.x, point.y); await page.mouse.down();
      try {
        await settle(page); const held = await wellAppearance(well);
        assert.equal(held.image, rest.image); assert.equal(held.background, rest.background);
        assert.deepEqual(held.glyphs, rest.glyphs);
      } finally { await page.mouse.up(); }
      assert.equal(await page.getByRole("listbox").isVisible(), false);
    }
    await saveWellEvidence(page, "disabled", { rest, final: await wellAppearance(well) });
  } finally { await f.close(); }
});
