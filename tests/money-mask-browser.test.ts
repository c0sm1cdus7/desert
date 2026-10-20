import test from "node:test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { caret, events, moneyBrowser, paste, position, resetEvents, settle, update } from "./fixtures/money-mask-browser.ts";

test("money groups while typing in the default locale and emits exact canonical minor units", async () => {
  const f = await moneyBrowser();
  try {
    await f.amount.pressSequentially("1234");
    assert.equal(await f.amount.inputValue(), "1,234");
    await f.amount.pressSequentially("567.89"); await settle(f.page);
    assert.equal(await f.amount.inputValue(), "1,234,567.89");
    assert.equal(await f.amount.getAttribute("aria-invalid"), "false");
    assert.deepEqual((await events(f.page)).at(-1), { kind: "money.change", control: "amount", currency: "USD", minorUnits: "123456789" });
    assert.equal((await events(f.page)).length, 9, "group insertion and incomplete decimal do not generate extra value events");
    assert.equal(await position(f.amount), 12);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("money uses explicit es-AR punctuation without losing large negative values", async () => {
  const f = await moneyBrowser();
  try {
    await update(f.page, { locale: "es-AR", currency: "ARS" });
    await f.amount.pressSequentially("1234567,89");
    assert.equal(await f.amount.inputValue(), "1.234.567,89");
    assert.equal((await events(f.page)).at(-1)?.minorUnits, "123456789");
    await paste(f.amount, "-90071992547409931234567890,12");
    assert.equal(await f.amount.inputValue(), "-90.071.992.547.409.931.234.567.890,12");
    assert.equal((await events(f.page)).at(-1)?.minorUnits, "-9007199254740993123456789012");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("money caret follows middle insertion, deletion and selected-range replacement across groups", async () => {
  const f = await moneyBrowser();
  try {
    await update(f.page, { minorUnits: "123456789" });
    assert.equal(await f.amount.inputValue(), "1,234,567.89");
    await caret(f.amount, 4); await f.amount.press("9");
    assert.equal(await f.amount.inputValue(), "12,394,567.89"); assert.equal(await position(f.amount), 5);
    await f.amount.press("Backspace");
    assert.equal(await f.amount.inputValue(), "1,234,567.89"); assert.equal(await position(f.amount), 4);
    await caret(f.amount, 2, 5); await f.amount.pressSequentially("90");
    assert.equal(await f.amount.inputValue(), "190,567.89"); assert.equal(await position(f.amount), 3);
    assert.equal((await events(f.page)).at(-1)?.minorUnits, "19056789");
    await caret(f.amount, 4); await f.amount.press("Delete");
    assert.equal(await f.amount.inputValue(), "19,067.89"); assert.equal(await position(f.amount), 4);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("money rejects malformed locale paste without stripping punctuation or emitting a value", async () => {
  const f = await moneyBrowser();
  try {
    for (const text of ["12,34.56", "1.234,56", "1,234.5.6", "USD 1,234.56"]) {
      await resetEvents(f.page); await paste(f.amount, text);
      assert.equal(await f.amount.inputValue(), "");
      assert.equal(await f.amount.getAttribute("aria-invalid"), "false");
      assert.deepEqual(await events(f.page), []);
    }
    await paste(f.amount, "1,234.56");
    assert.equal(await f.amount.inputValue(), "1,234.56");
    assert.equal((await events(f.page)).at(-1)?.minorUnits, "123456");
    await update(f.page, { locale: "es-AR" }); await resetEvents(f.page);
    await paste(f.amount, "1,234.56");
    assert.equal(await f.amount.inputValue(), "1.234,56");
    assert.equal(await f.amount.getAttribute("aria-invalid"), "false");
    assert.deepEqual(await events(f.page), []);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("money refuses excess precision without rounding, then clearing emits null", async () => {
  const f = await moneyBrowser();
  try {
    await update(f.page, { minorUnits: "123456" });
    await paste(f.amount, "1234.567");
    assert.equal(await f.amount.inputValue(), "1,234.56");
    assert.equal(await f.amount.getAttribute("aria-invalid"), "false");
    assert.deepEqual(await events(f.page), []);
    await f.amount.fill("");
    assert.equal(await f.amount.inputValue(), "");
    assert.equal(await f.amount.getAttribute("aria-invalid"), "false");
    assert.deepEqual(await events(f.page), [{ kind: "money.change", control: "amount", currency: "USD", minorUnits: null }]);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("currency changes preserve the exact amount and reject a scale change that would round", async () => {
  const f = await moneyBrowser();
  try {
    await update(f.page, { minorUnits: "123456700" });
    await f.page.getByRole("button", { name: "USD · Amount currency", exact: true }).click();
    await f.page.getByRole("option", { name: "JPY", exact: true }).click();
    assert.deepEqual(await events(f.page), [{ kind: "money.change", control: "amount", currency: "JPY", minorUnits: "1234567" }]);
    await update(f.page, { currency: "USD", minorUnits: "123456789" }); await resetEvents(f.page);
    await f.page.getByRole("button", { name: "USD · Amount currency", exact: true }).click();
    await f.page.getByRole("option", { name: "JPY", exact: true }).click();
    assert.equal(await f.amount.inputValue(), "1,234,567.89");
    assert.equal(await f.amount.getAttribute("aria-invalid"), "true");
    assert.deepEqual(await events(f.page), []);
    assert.equal(await f.page.getByRole("button", { name: "USD · Amount currency", exact: true }).count(), 1);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("money owner changes reformat locale, identity and precision without emitting", async () => {
  const f = await moneyBrowser();
  try {
    await update(f.page, { minorUnits: "123456789" });
    assert.equal(await f.amount.inputValue(), "1,234,567.89");
    await update(f.page, { locale: "es-AR" });
    assert.equal(await f.amount.inputValue(), "1.234.567,89");
    await f.amount.fill("-");
    await update(f.page, { id: "replacement", minorUnits: "987654321" });
    assert.equal(await f.amount.inputValue(), "9.876.543,21");
    assert.equal(await f.amount.getAttribute("aria-invalid"), "false");
    await update(f.page, { currencies: [{ code: "USD", scale: 3 }] });
    assert.equal(await f.amount.inputValue(), "987.654,321");
    await update(f.page, { minorUnits: null }); assert.equal(await f.amount.inputValue(), "");
    assert.deepEqual(await events(f.page), []); assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("money leaves composition untouched until completion, then masks and emits once", async () => {
  const f = await moneyBrowser();
  try {
    await f.amount.dispatchEvent("compositionstart", { data: "" });
    await f.amount.evaluate(element => {
      const field = element as HTMLInputElement; field.value = "1234";
      field.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertCompositionText", data: "1234", isComposing: true }));
    });
    await settle(f.page);
    assert.equal(await f.amount.inputValue(), "1234"); assert.deepEqual(await events(f.page), []);
    await f.amount.dispatchEvent("compositionend", { data: "1234" }); await settle(f.page);
    assert.equal(await f.amount.inputValue(), "1,234");
    assert.deepEqual(await events(f.page), [{ kind: "money.change", control: "amount", currency: "USD", minorUnits: "123400" }]);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("money native keyboard undo and redo preserve formatted values and canonical events", async () => {
  const f = await moneyBrowser();
  try {
    await update(f.page, { minorUnits: "12300" }); await caret(f.amount, 3);
    await f.amount.press("4"); assert.equal(await f.amount.inputValue(), "1,234.00");
    const modifier = process.platform === "darwin" ? "Meta" : "Control";
    await f.amount.press(`${modifier}+z`); await settle(f.page);
    assert.equal(await f.amount.inputValue(), "123.00"); assert.equal((await events(f.page)).at(-1)?.minorUnits, "12300");
    await f.amount.press(`${modifier}+Shift+z`); await settle(f.page);
    assert.equal(await f.amount.inputValue(), "1,234.00"); assert.equal((await events(f.page)).at(-1)?.minorUnits, "123400");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

for (const colorScheme of ["light", "dark"] as const) test(`currency symbols decorate trigger and options without changing accessible codes (${colorScheme})`, async () => {
  const f = await moneyBrowser(true);
  try {
    await f.page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    const trigger = f.page.getByRole("button", { name: "USD · Amount currency", exact: true });
    assert.match(await trigger.innerText(), /\$/);
    assert.equal(await trigger.locator('[data-piece="face"]').count(), 0);
    await trigger.click();
    const panel = f.page.getByRole("listbox");
    assert.equal(await panel.getByRole("option", { name: "ARS", exact: true }).locator('[data-currency-symbol]').innerText(), "$" );
    assert.match(await panel.getByRole("option", { name: "EUR", exact: true }).innerText(), /€/);
    assert.equal(await panel.getByRole("option", { name: "JPY", exact: true }).count(), 1);
    assert.equal(await f.page.locator('[aria-modal="true"],.scrim').count(), 0);
    const directory = `artifacts/money-mask/${process.env.DESERT_EVIDENCE_PHASE ?? "final"}`;
    await mkdir(directory, { recursive: true }); await f.page.screenshot({ path: `${directory}/currency-symbols-${colorScheme}.png` });
    await panel.getByRole("option", { name: "EUR", exact: true }).click();
    assert.match(await f.page.getByRole("button", { name: "EUR · Amount currency", exact: true }).innerText(), /€/);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
