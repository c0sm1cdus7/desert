import test from "node:test";
import assert from "node:assert/strict";
import { caret, events, moneyBrowser, paste, position, resetEvents, settle, update } from "./fixtures/money-mask-browser.ts";

test("masked history coalesces adjacent typing and supports Windows undo/redo keys", async () => {
  const f = await moneyBrowser();
  try {
    await f.amount.pressSequentially("1234567");
    await f.amount.press("Control+z");
    assert.equal(await f.amount.inputValue(), "");
    assert.equal((await events(f.page)).at(-1)?.minorUnits, null);
    await f.amount.press("Control+y");
    assert.equal(await f.amount.inputValue(), "1,234,567");
    assert.equal((await events(f.page)).at(-1)?.minorUnits, "123456700");
    assert.equal(await position(f.amount), 9); assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("masked history restores selected ranges and handles browser history input events", async () => {
  const f = await moneyBrowser();
  try {
    await update(f.page, { minorUnits: "123456" }); await caret(f.amount, 2, 5);
    await f.amount.press("9"); assert.equal(await f.amount.inputValue(), "19.56");
    const before = (inputType: string) => f.amount.evaluate((element, type) => !element.dispatchEvent(new InputEvent(
      "beforeinput", { bubbles: true, cancelable: true, inputType: type })), inputType);
    assert.equal(await before("historyUndo"), true);
    assert.equal(await f.amount.inputValue(), "1,234.56");
    assert.deepEqual(await f.amount.evaluate(element => {
      const input = element as HTMLInputElement; return [input.selectionStart, input.selectionEnd];
    }), [2, 5]);
    assert.equal(await before("historyRedo"), true);
    assert.equal(await f.amount.inputValue(), "19.56"); assert.equal(await position(f.amount), 2);
    assert.equal((await events(f.page)).at(-1)?.minorUnits, "1956"); assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("composition makes one undoable edit and does not coalesce with later typing", async () => {
  const f = await moneyBrowser();
  try {
    await update(f.page, { minorUnits: "100" }); await caret(f.amount, 0, 4);
    await f.amount.dispatchEvent("compositionstart", { data: "" });
    for (const value of ["1", "12", "1234"]) await f.amount.evaluate((element, text) => {
      const field = element as HTMLInputElement; field.value = text; field.setSelectionRange(text.length, text.length);
      field.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertCompositionText", data: text, isComposing: true }));
    }, value);
    assert.deepEqual(await events(f.page), []);
    await f.amount.dispatchEvent("compositionend", { data: "1234" });
    await f.amount.press("5"); assert.equal(await f.amount.inputValue(), "12,345");
    await f.amount.press("Control+z"); assert.equal(await f.amount.inputValue(), "1,234");
    await f.amount.press("Control+z"); assert.equal(await f.amount.inputValue(), "1.00");
    await f.amount.press("Control+Shift+z"); assert.equal(await f.amount.inputValue(), "1,234");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("owner values and context replacements clear history without publishing an edit", async () => {
  const f = await moneyBrowser();
  try {
    for (const patch of [{ minorUnits: "987600" }, { locale: "es-AR" }, { id: "new-amount" }, { currency: "EUR" }]) {
      await paste(f.amount, "1234"); await update(f.page, patch); await resetEvents(f.page);
      const current = await f.amount.inputValue();
      await f.amount.press("Control+z"); await f.amount.press("Control+y"); await settle(f.page);
      assert.equal(await f.amount.inputValue(), current);
      assert.deepEqual(await events(f.page), []);
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("rejected paste preserves redo, while a new accepted edit discards redo", async () => {
  const f = await moneyBrowser();
  try {
    await paste(f.amount, "1234"); await paste(f.amount, "12345");
    await f.amount.press("Control+z"); assert.equal(await f.amount.inputValue(), "1,234");
    await paste(f.amount, "12,34.56"); assert.equal(await f.amount.inputValue(), "1,234");
    await resetEvents(f.page); await f.amount.press("Control+y");
    assert.equal(await f.amount.inputValue(), "12,345");
    assert.equal(await f.amount.getAttribute("aria-invalid"), "false");
    assert.equal((await events(f.page)).at(-1)?.minorUnits, "1234500");
    await f.amount.press("Control+z"); await caret(f.amount, 5); await f.amount.press("5");
    assert.equal(await f.amount.inputValue(), "12,345"); await resetEvents(f.page);
    await f.amount.press("Control+y");
    assert.equal(await f.amount.inputValue(), "12,345"); assert.deepEqual(await events(f.page), []);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
