import test from "node:test";
import assert from "node:assert/strict";
import type { Page } from "playwright";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";

const source = `<script>
  import { tick } from "svelte";
  import MoneyControl from "./src/svelte/controls/MoneyControl.svelte";
  let node = $state({ version: "desert.control/1", kind: "money", id: "amount", label: "Amount", disabled: false,
    required: false, currencies: [{ code: "ARS", scale: 2 }, { code: "USD", scale: 2 }], currency: "ARS", minorUnits: "100" });
  window.moneyEvents = []; window.moneyEcho = true;
  window.replaceMoney = async patch => { node = { ...node, ...patch }; await tick(); };
  window.moneyTick = tick;
</script>
<MoneyControl {node} onevent={event => { window.moneyEvents.push(event);
  if (window.moneyEcho) node = { ...node, minorUnits: event.minorUnits, currency: event.currency }; }} />`;
type Harness = Window & {
  replaceMoney: (patch: object) => Promise<void>; moneyTick: () => Promise<void>;
  moneyEvents: { minorUnits: string | null; currency: string }[]; moneyEcho: boolean;
};
const update = (page: Page, patch: object) => page.evaluate(value => (window as unknown as Harness).replaceMoney(value), patch);
const settle = (page: Page) => page.evaluate(() => (window as unknown as Harness).moneyTick());

test("money follows owner amount, currency, reset, identity and scale changes without emitting", { timeout: 30000 }, async () => {
  const f = await svelteBrowser(source);
  const amount = f.page.locator('input[inputmode="decimal"]');
  try {
    assert.equal(await amount.inputValue(), "1.00");
    await update(f.page, { minorUnits: "200" });
    assert.equal(await amount.inputValue(), "2.00");
    await update(f.page, { currency: "USD", minorUnits: "300" });
    assert.equal(await amount.inputValue(), "3.00");
    assert.equal(await f.page.getByRole("button", { name: "USD · Amount currency" }).count(), 1);
    await update(f.page, { minorUnits: null });
    assert.equal(await amount.inputValue(), "");
    await amount.fill("-");
    assert.equal(await amount.getAttribute("aria-invalid"), "true");
    await update(f.page, { id: "other-amount" });
    assert.equal(await amount.inputValue(), "");
    assert.equal(await amount.getAttribute("aria-invalid"), "false");
    await update(f.page, { minorUnits: "345" });
    await amount.fill("1.005");
    await update(f.page, { currencies: [{ code: "ARS", scale: 2 }, { code: "USD", scale: 3 }] });
    assert.equal(await amount.inputValue(), "0.345");
    assert.equal(await amount.getAttribute("aria-invalid"), "false");
    assert.deepEqual(await f.page.evaluate(() => (window as unknown as Harness).moneyEvents), []);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("money retains lexical self-edits and invalid drafts across echoes, but owner replacement wins", { timeout: 30000 }, async () => {
  const f = await svelteBrowser(source);
  const amount = f.page.locator('input[inputmode="decimal"]');
  try {
    for (const text of ["1", "-0", "01.20"]) {
      await amount.fill(text); await settle(f.page);
      assert.equal(await amount.inputValue(), text);
    }
    await amount.fill("-"); await settle(f.page);
    await update(f.page, { label: "Amount renamed" });
    assert.equal(await amount.inputValue(), "-");
    assert.equal(await amount.getAttribute("aria-invalid"), "true");
    await update(f.page, { minorUnits: "250" });
    assert.equal(await amount.inputValue(), "2.50");
    assert.equal(await amount.getAttribute("aria-invalid"), "false");
    await f.page.evaluate(() => { (window as unknown as Harness).moneyEcho = false; });
    await amount.fill("1"); await amount.fill("12"); await amount.fill("12.");
    await update(f.page, { minorUnits: "100" });
    assert.equal(await amount.inputValue(), "12.");
    await update(f.page, { minorUnits: "1200" });
    assert.equal(await amount.inputValue(), "12.");
    assert.equal(await amount.getAttribute("aria-invalid"), "true");
    await update(f.page, { minorUnits: null });
    assert.equal(await amount.inputValue(), "");
    assert.equal(await amount.getAttribute("aria-invalid"), "false");
    assert.deepEqual((await f.page.evaluate(() => (window as unknown as Harness).moneyEvents)).map(event => event.minorUnits),
      ["100", "0", "120", "100", "1200"]);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
