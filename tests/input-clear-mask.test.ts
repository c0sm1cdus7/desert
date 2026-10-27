import test from "node:test";
import assert from "node:assert/strict";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { textClearSource, moneyClearSource, updateClear, clearEvents, withoutClearEcho } from "./fixtures/input-clear.ts";

test("text-mask clear removes incomplete drafts even while the canonical value is empty", async () => {
  const f = await svelteBrowser(textClearSource);
  try {
    await updateClear(f.page, { mask: { kind: "decimal", locale: "en-US", scale: 2 } });
    await withoutClearEcho(f.page);
    const field = f.page.getByRole("textbox", { name: "Writing", exact: true });
    const clear = f.page.getByRole("button", { name: "Clear Writing", exact: true });
    for (const draft of ["-", "12."]) {
      await field.fill(draft);
      assert.equal(await clear.count(), 1);
      assert.equal(await field.getAttribute("aria-invalid"), "true");
      await clear.click();
      assert.equal(await field.inputValue(), "");
      assert.equal(await field.getAttribute("aria-invalid"), "false");
      assert.equal(await field.evaluate(element => element === document.activeElement), true);
      assert.equal(await clear.count(), 0);
      assert.equal((await clearEvents(f.page)).at(-1), "");
    }
    assert.equal(await f.page.locator("[data-submissions]").innerText(), "0");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("money clear edits only the amount, including incomplete drafts and numeric zero", async () => {
  const f = await svelteBrowser(moneyClearSource);
  try {
    await withoutClearEcho(f.page);
    const field = f.page.getByRole("textbox", { name: "Amount", exact: true });
    const clear = f.page.getByRole("button", { name: "Clear Amount", exact: true });
    for (const draft of ["-", "12,", "0", "1.234,50"]) {
      await field.fill(draft);
      assert.equal(await clear.count(), 1);
      await clear.click();
      assert.equal(await field.inputValue(), "");
      assert.equal(await field.getAttribute("aria-invalid"), "false");
      assert.equal(await field.evaluate(element => element === document.activeElement), true);
      assert.equal(await clear.count(), 0);
      assert.equal(await f.page.locator("[data-currency]").innerText(), "ARS");
      assert.deepEqual((await clearEvents(f.page)).at(-1), { kind: "money.change", control: "budget", currency: "ARS", minorUnits: null });
    }
    // A disabled amount offers no clear (second review of the slice 3 package: one rule for every field); its value and
    // its events stay as they were.
    const count = (await clearEvents(f.page)).length;
    await updateClear(f.page, { minorUnits: "250", disabled: true });
    assert.equal(await clear.count(), 0);
    assert.equal(await field.inputValue(), "2,50");
    assert.equal((await clearEvents(f.page)).length, count);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("clearing a masked draft is one undoable edit and owner replacement remains authoritative", async () => {
  const f = await svelteBrowser(textClearSource);
  try {
    await updateClear(f.page, { mask: { kind: "decimal", locale: "en-US", scale: 2 }, required: true });
    const field = f.page.getByRole("textbox", { name: "Writing", exact: true });
    const clear = f.page.getByRole("button", { name: "Clear Writing", exact: true });
    for (const draft of ["1,234.50", "12."]) {
      await field.fill(draft); await clear.click();
      assert.equal(await field.inputValue(), "", "Required means validation, not a prohibition on editing");
      await field.press("Control+z");
      assert.equal(await field.inputValue(), draft, "Undo restores the visible lexical draft, not merely its canonical value");
      assert.equal(await clear.count(), 1);
      await field.press("Control+Shift+z");
      assert.equal(await field.inputValue(), "");
      assert.equal(await clear.count(), 0);
    }
    await updateClear(f.page, { value: "42.00" });
    assert.equal(await field.inputValue(), "42.00");
    assert.equal(await clear.count(), 1);
    await field.press("Control+z");
    assert.equal(await field.inputValue(), "42.00", "An external owner replacement starts a new edit history");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("completed IME composition can be cleared and undone without a delayed composition echo", async () => {
  const f = await svelteBrowser(textClearSource);
  try {
    await updateClear(f.page, { mask: { kind: "decimal", locale: "en-US", scale: 2 } });
    const field = f.page.getByRole("textbox", { name: "Writing", exact: true });
    await field.focus();
    // Synthetic browser events exercise the edit state machine, not a claim about an OS IME.
    await field.evaluate(element => {
      const input = element as HTMLInputElement;
      input.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
      input.value = "1234";
      input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertCompositionText", isComposing: true }));
      input.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "1234" }));
      input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
    });
    await f.page.getByRole("button", { name: "Clear Writing", exact: true }).click();
    assert.equal(await field.inputValue(), "");
    assert.equal(await field.getAttribute("aria-invalid"), "false");
    await field.press("Control+z");
    assert.equal(await field.inputValue(), "1,234");
    assert.equal(await field.getAttribute("aria-invalid"), "false");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
