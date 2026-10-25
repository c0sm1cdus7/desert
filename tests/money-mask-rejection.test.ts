import test from "node:test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { caret, events, moneyBrowser, paste, position, resetEvents, update } from "./fixtures/money-mask-browser.ts";

test("money refuses impossible keyboard edits without replacing selected digits or moving the caret", async () => {
  const f = await moneyBrowser();
  try {
    await f.amount.pressSequentially("1234.56"); await resetEvents(f.page);
    for (const key of ["a", "e", "+", "-", ".", "7"]) {
      await caret(f.amount, 8); await f.amount.press(key);
      assert.equal(await f.amount.inputValue(), "1,234.56", key);
      assert.equal(await position(f.amount), 8, key);
    }
    await caret(f.amount, 2, 5); await f.amount.press("x");
    assert.equal(await f.amount.inputValue(), "1,234.56");
    assert.deepEqual(await f.amount.evaluate(e => [(e as HTMLInputElement).selectionStart, (e as HTMLInputElement).selectionEnd]), [2, 5]);
    assert.equal(await f.amount.getAttribute("aria-invalid"), "false");
    assert.deepEqual(await events(f.page), []);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("money rejects malformed paste atomically, preserving the accepted draft and undo stack", async () => {
  const f = await moneyBrowser();
  try {
    await paste(f.amount, "1234.50"); await resetEvents(f.page);
    for (const value of ["USD 9.00", "9e3", "1.234,50", "12,34.56", "1234.567", "--1", "１２"])
      { await paste(f.amount, value); assert.equal(await f.amount.inputValue(), "1,234.50", value); }
    assert.deepEqual(await events(f.page), []);
    await f.amount.press("Control+z"); assert.equal(await f.amount.inputValue(), "");
    await f.amount.press("Control+y"); assert.equal(await f.amount.inputValue(), "1,234.50");
    await update(f.page, { locale: "es-AR" }); await resetEvents(f.page);
    await paste(f.amount, "1,234.50"); assert.equal(await f.amount.inputValue(), "1.234,50");
    await paste(f.amount, "9.876,50"); assert.equal(await f.amount.inputValue(), "9.876,50");
    assert.equal((await events(f.page)).at(-1)?.minorUnits, "987650");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("noncancelable edits and invalid IME commits restore the pre-edit draft without publishing", async () => {
  const f = await moneyBrowser();
  try {
    await update(f.page, { minorUnits: "123456" }); await caret(f.amount, 2, 5);
    await f.amount.evaluate(element => {
      const field = element as HTMLInputElement;
      field.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, inputType: "insertReplacementText", data: "abc" }));
      field.setRangeText("abc", field.selectionStart!, field.selectionEnd!, "end");
      field.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertReplacementText", data: "abc" }));
    });
    assert.equal(await f.amount.inputValue(), "1,234.56");
    assert.deepEqual(await f.amount.evaluate(e => [(e as HTMLInputElement).selectionStart, (e as HTMLInputElement).selectionEnd]), [2, 5]);
    await f.amount.dispatchEvent("compositionstart", { data: "" });
    await f.amount.evaluate(element => {
      const field = element as HTMLInputElement; field.value = "日本語";
      field.dispatchEvent(new InputEvent("input", { bubbles: true, isComposing: true, inputType: "insertCompositionText" }));
    });
    assert.equal(await f.amount.inputValue(), "日本語", "Do not corrupt active composition");
    await f.amount.dispatchEvent("compositionend", { data: "日本語" });
    assert.equal(await f.amount.inputValue(), "1,234.56");
    assert.deepEqual(await events(f.page), []);
    assert.equal(await f.amount.getAttribute("aria-invalid"), "false");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

for (const colorScheme of ["light", "dark"] as const) test(`money prefix and options use an unboxed muted symbol (${colorScheme})`, async () => {
  const f = await moneyBrowser(true);
  try {
    await f.page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    const trigger = f.page.getByRole("button", { name: "USD · Amount currency", exact: true });
    const directory = `artifacts/money-input-guard/${process.env.DESERT_EVIDENCE_PHASE ?? "final"}`;
    await mkdir(directory, { recursive: true }); await f.page.screenshot({ path: `${directory}/prefix-${colorScheme}.png` });
    assert.equal(await trigger.locator('[data-piece="face"]').count(), 0);
    const symbol = trigger.locator('[data-choice-symbol]');
    assert.equal(await symbol.innerText(), "$");
    assert.deepEqual(await symbol.evaluate(element => {
      const style = getComputedStyle(element); return [style.borderTopWidth, style.backgroundColor];
    }), ["0px", "rgba(0, 0, 0, 0)"]);
    assert.notEqual(await symbol.evaluate(e => getComputedStyle(e).color), await trigger.evaluate(e => getComputedStyle(e).color));
    await trigger.click();
    assert.equal(await f.page.getByRole("option", { name: "ARS", exact: true }).locator('[data-choice-symbol]').innerText(), "$" );
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
