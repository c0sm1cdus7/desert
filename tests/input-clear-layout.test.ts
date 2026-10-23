import test from "node:test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { layoutClearSource, moneyClearSource, updateClear } from "./fixtures/input-clear.ts";

for (const colorScheme of ["light", "dark"] as const) {
  for (const width of [1280, 390, 320]) {
    test(`clear accessories fit ${width}px, 200% text, and textarea footer (${colorScheme})`, async () => {
      const f = await svelteBrowser(layoutClearSource);
      try {
        await f.page.addStyleTag({ content: await rendererCss() });
        await f.page.setViewportSize({ width, height: 1000 });
        await f.page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
        await f.page.evaluate(() => document.documentElement.style.setProperty("--text-scale", "2"));
        assert.equal(await f.page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        for (const well of await f.page.locator("[data-floating-field]").all()) {
          const editor = well.getByRole("textbox");
          const clear = well.getByRole("button", { name: /^Clear / });
          const box = await well.boundingBox(), editorBox = await editor.boundingBox(), clearBox = await clear.boundingBox();
          assert.ok(box && editorBox && clearBox);
          assert.ok(clearBox.x >= editorBox.x + editorBox.width - 1 || clearBox.y >= editorBox.y + editorBox.height - 1,
            "The accessory occupies its own space beside or below the editor, never the text");
          assert.ok(clearBox.x + clearBox.width <= box.x + box.width + 1);
          assert.ok(clearBox.y >= box.y && clearBox.y + clearBox.height <= box.y + box.height + 1);
          if (width < 768) assert.ok(clearBox.width >= 44 && clearBox.height >= 44, "Compact touch targets remain at least 44px");
          const label = well.locator('[data-slot="field-label"]');
          const labelBox = await label.boundingBox(); assert.ok(labelBox);
          assert.ok(labelBox.y + labelBox.height <= editorBox.y + 1, "Enlarged multiline labels reserve their own space");
          assert.ok(labelBox.y + labelBox.height <= clearBox.y + 1 || labelBox.x + labelBox.width <= clearBox.x + 1,
            "A label may span the full row above the accessory; they must never overlap");
        }
        const multiline = f.page.locator('[data-primitive="input.multiline"]');
        const textarea = await multiline.getByRole("textbox").boundingBox();
        const counter = await multiline.locator("[data-character-counter]").boundingBox();
        const clear = await multiline.getByRole("button", { name: /^Clear / }).boundingBox();
        assert.ok(textarea && counter && clear);
        assert.ok(counter.y >= textarea.y + textarea.height - 1, "The passive counter stays below the editor");
        assert.ok(clear.y + clear.height <= counter.y, "The active clear accessory does not compete with the footer counter");
        await mkdir("artifacts/input-clear/final", { recursive: true });
        await f.page.screenshot({ path: `artifacts/input-clear/final/source-${colorScheme}-${width}.png`, fullPage: true, animations: "disabled" });
        assert.deepEqual(f.errors, []);
      } finally { await f.close(); }
    });
  }
}

test("clear inherits the shared button hover and pressed feedback", async () => {
  const f = await svelteBrowser(layoutClearSource);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    await f.page.setViewportSize({ width: 1280, height: 800 });
    const clear = f.page.getByRole("button", { name: /^Clear / }).first();
    await f.page.evaluate(async () => {
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      await Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {})));
    });
    const rest = await clear.evaluate(element => getComputedStyle(element).color);
    const restingShadow = await clear.evaluate(element => getComputedStyle(element).boxShadow);
    await clear.hover();
    await f.page.waitForFunction(resting => getComputedStyle(document.querySelector('[data-input-clear]')!).boxShadow !== resting, restingShadow);
    await f.page.evaluate(async () => { await Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {}))); });
    const hover = await clear.evaluate(element => getComputedStyle(element).color);
    const hoverShadow = await clear.evaluate(element => getComputedStyle(element).boxShadow);
    assert.equal(hover, rest, "neutral hover preserves semantic foreground");
    assert.notEqual(hoverShadow, restingShadow, "neutral hover feedback remains perceptible");
    assert.equal(await clear.evaluate(element => getComputedStyle(element).backgroundImage), 'none');
    await f.page.mouse.down();
    assert.notEqual(await clear.getAttribute("data-pressed"), null);
    await f.page.waitForFunction(() => getComputedStyle(document.querySelector('[data-input-clear] [data-button-content]')!).transform !== 'none');
    await f.page.evaluate(async () => { await Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {}))); });
    assert.notEqual(await clear.evaluate(element => getComputedStyle(element).boxShadow), hoverShadow);
    assert.equal(await clear.evaluate(element => getComputedStyle(element).backgroundImage), 'none');
    await f.page.mouse.move(1000, 750); await f.page.mouse.up();
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("compact Money keeps its currency, unbroken label, and clear target at normal and 200% text", async () => {
  const f = await svelteBrowser(moneyClearSource);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    await updateClear(f.page, { minorUnits: "123450", required: true, currencies: [
      { code: "ARS", scale: 2, face: { kind: "flag", region: "AR" } }, { code: "USD", scale: 2 },
    ] });
    const well = f.page.locator("[data-floating-field]");
    const label = well.locator('[data-slot="field-label"]');
    const amount = f.page.getByRole("textbox", { name: "Amount", exact: true });
    const currency = f.page.getByRole("button", { name: "ARS · Amount currency", exact: true });
    const clear = f.page.getByRole("button", { name: "Clear Amount", exact: true });
    for (const colorScheme of ["light", "dark"] as const) for (const width of [320, 390]) for (const scale of [1, 2]) {
      await f.page.setViewportSize({ width, height: 500 });
      await f.page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
      await f.page.evaluate(value => document.documentElement.style.setProperty("--text-scale", String(value)), scale);
      await mkdir("artifacts/input-clear/final", { recursive: true });
      await well.screenshot({ path: `artifacts/input-clear/final/money-${colorScheme}-${width}-${scale}x.png`, animations: "disabled" });
      const box = await well.boundingBox(), editorBox = await amount.boundingBox();
      const clearBox = await clear.boundingBox(), currencyBox = await currency.boundingBox();
      assert.ok(box && editorBox && clearBox && currencyBox);
      assert.ok(clearBox.width >= 44 && clearBox.height >= 44);
      assert.ok(clearBox.x >= editorBox.x + editorBox.width - 1,
        `Clear must not overlap the amount: ${JSON.stringify({ width, scale, editorBox, clearBox })}`);
      assert.ok(clearBox.x + clearBox.width <= box.x + box.width + 1);
      assert.ok(currencyBox.y + currencyBox.height <= editorBox.y + 1 || currencyBox.x + currencyBox.width <= editorBox.x + 1,
        "Currency has its own row or prefix region, never overlaps the editable amount");
      const labelGeometry = await label.evaluate(element => {
        const style=getComputedStyle(element);
        // Grid labels include a preserved top inset; only their content must fit one line.
        return { height:element.getBoundingClientRect().height-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom),
          lineHeight:parseFloat(style.lineHeight) };
      });
      assert.ok(labelGeometry.height <= labelGeometry.lineHeight + 1, `Amount must remain one intact line (${width}px, ${scale}x)`);
      assert.equal(await currency.isVisible(), true); assert.match(await currency.innerText(), /\$.*ARS/s);
      assert.equal(await f.page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
