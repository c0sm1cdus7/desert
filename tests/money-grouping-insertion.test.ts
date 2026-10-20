import test from "node:test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { caret, events, moneyBrowser, resetEvents, update } from "./fixtures/money-mask-browser.ts";

for (const { locale, display, malformed } of [
  { locale: "en-US", display: "42.00", malformed: "1,23.40" },
  { locale: "es-AR", display: "42,00", malformed: "123.40" },
]) test(`inserted grouping must be valid in ${locale}, never silently change the amount`, async () => {
  await mkdir('artifacts/picker-regression-repair', { recursive: true });
  const f = await moneyBrowser();
  try {
    await update(f.page, { locale, minorUnits: "4200" });
    await resetEvents(f.page);
    await f.amount.fill(malformed);
    assert.equal(await f.amount.inputValue(), display, "reject the entire malformed replacement");
    assert.deepEqual(await events(f.page), [], "rejected punctuation must not become a different monetary amount");
    const group = locale === "es-AR" ? "." : ",";
    await caret(f.amount, 1); await f.amount.press(group);
    assert.equal(await f.amount.inputValue(), display, "a newly typed misplaced separator is not generated grouping");
    assert.deepEqual(await events(f.page), []);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("valid grouped insertion and regrouping existing separators preserve exact minor units", async () => {
  const f = await moneyBrowser();
  try {
    await f.amount.fill("1,234.50");
    assert.equal((await events(f.page)).at(-1)?.minorUnits, "123450");
    await caret(f.amount, 2); await f.amount.press("9");
    assert.equal(await f.amount.inputValue(), "19,234.50");
    assert.equal((await events(f.page)).at(-1)?.minorUnits, "1923450");
    await update(f.page, { locale: "es-AR" });
    await f.amount.fill("123,40");
    assert.equal((await events(f.page)).at(-1)?.minorUnits, "12340");
    await f.page.getByRole("button", { name: "USD · Amount currency", exact: true }).click();
    await f.page.getByRole("option", { name: "ARS", exact: true }).click();
    assert.equal(await f.amount.inputValue(), "123,40");
    assert.deepEqual((await events(f.page)).at(-1),
      { kind: "money.change", control: "amount", currency: "ARS", minorUnits: "12340" });
  } finally { await f.close(); }
});
