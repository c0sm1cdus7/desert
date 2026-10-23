import test from "node:test";
import assert from "node:assert/strict";
import type { Page } from "playwright";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

const source = `<script lang="ts">
  import { tick } from 'svelte';
  import NodeRenderer from '@desert/svelte/catalog/renderer/node-renderer/NodeRenderer.svelte';
  let node = $state({ version: 'desert.bank-node/1', kind: 'input.text', name: 'quantity', label: 'Quantity',
    value: '', required: false, disabled: false, mask: { kind: 'decimal', locale: 'en-US', scale: 2 } });
  let events = $state([]);
  window.echoInput = true;
  window.replaceInput = async patch => { node = { ...node, ...patch }; await tick(); };
</script>
<main style="max-width:640px;padding:24px">
  <NodeRenderer {node} onevent={event => { events.push(event); if (event.kind === 'input.change' && window.echoInput) node = { ...node, value: event.value }; }} />
  <button>Outside</button><output data-events>{JSON.stringify(events)}</output><output data-owner>{node.value}</output>
</main>`;
const update = (page: Page, patch: object) => page.evaluate(value =>
  (window as unknown as { replaceInput: (patch: object) => Promise<void> }).replaceInput(value), patch);
const events = async (page: Page) => JSON.parse(await page.locator('[data-events]').innerText());

test("bank text mask displays grouped values but publishes canonical text once", async () => {
  const f = await svelteBrowser(source);
  try {
    const field = f.page.getByRole('textbox', { name: 'Quantity', exact: true });
    await update(f.page, { value: '1234.50' });
    assert.equal(await field.inputValue(), '1,234.50');
    assert.equal(await field.getAttribute('data-input-mask'), 'decimal');
    await field.fill('9,876.50');
    await f.page.getByRole('button', { name: 'Outside' }).click();
    assert.equal(await field.inputValue(), '9,876.50');
    assert.equal(await f.page.locator('[data-owner]').innerText(), '9876.50');
    assert.deepEqual(await events(f.page), [{ kind: 'input.change', name: 'quantity', value: '9876.50' }]);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("incomplete masked writing stays visible; impossible edits are rejected without publication", async () => {
  const f = await svelteBrowser(source);
  try {
    const field = f.page.getByRole('textbox', { name: 'Quantity', exact: true });
    for (const draft of ['-', '12.']) {
      await field.fill(draft);
      await f.page.getByRole('button', { name: 'Outside' }).click();
      assert.equal(await field.inputValue(), draft);
      assert.equal(await field.getAttribute('aria-invalid'), 'true');
      assert.equal(await f.page.locator('[data-floating-field]').getAttribute('data-filled'), 'true');
      assert.equal(await f.page.locator('[data-owner]').innerText(), '');
      assert.deepEqual(await events(f.page), []);
    }
    for (const impossible of ['1.005', 'not a number']) {
      await field.fill(impossible);
      assert.equal(await field.inputValue(), '12.');
      assert.deepEqual(await events(f.page), []);
    }
    await field.fill('12.50');
    assert.equal(await field.getAttribute('aria-invalid'), 'false');
    assert.deepEqual(await events(f.page), [{ kind: 'input.change', name: 'quantity', value: '12.50' }]);
    await field.fill('');
    assert.equal(await f.page.locator('[data-floating-field]').getAttribute('data-filled'), 'false');
    assert.equal((await events(f.page)).length, 2);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("owner value, mask context and field identity replacements reset local errors without edits", async () => {
  const f = await svelteBrowser(source);
  try {
    const field = f.page.getByRole('textbox', { name: 'Quantity', exact: true });
    await field.fill('12.');
    await update(f.page, { value: '42.00' });
    assert.equal(await field.inputValue(), '42.00');
    assert.equal(await field.getAttribute('aria-invalid'), 'false');
    await field.fill('-');
    await update(f.page, { mask: { kind: 'decimal', locale: 'es-AR', scale: 2 } });
    assert.equal(await field.inputValue(), '42,00');
    assert.equal(await field.getAttribute('aria-invalid'), 'false');
    await field.fill('12,');
    await update(f.page, { name: 'other-quantity' });
    assert.equal(await field.inputValue(), '42,00');
    assert.equal(await field.getAttribute('aria-invalid'), 'false');
    assert.equal(await f.page.locator('[data-slot="field-error"][role="status"]').count(), 0);
    assert.deepEqual(await events(f.page), []);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("delayed own acknowledgements preserve a newer incomplete draft and its error", async () => {
  const f = await svelteBrowser(source);
  try {
    const field = f.page.getByRole('textbox', { name: 'Quantity', exact: true });
    await f.page.evaluate(() => { (window as unknown as { echoInput: boolean }).echoInput = false; });
    await field.fill('1'); await field.fill('12'); await field.fill('12.');
    for (const value of ['1', '12']) {
      await update(f.page, { value });
      assert.equal(await field.inputValue(), '12.');
      assert.equal(await field.getAttribute('aria-invalid'), 'true');
    }
    assert.equal((await events(f.page)).length, 2);
    await update(f.page, { value: '42.00' });
    assert.equal(await field.inputValue(), '42.00');
    assert.equal(await field.getAttribute('aria-invalid'), 'false');
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`masked invalid content keeps normal color and only label uses error color (${colorScheme})`, async () => {
    const f = await svelteBrowser(source);
    try {
      await f.page.addStyleTag({ content: await rendererCss() });
      await f.page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      const field = f.page.getByRole('textbox', { name: 'Quantity', exact: true });
      const valueColor = await field.evaluate(element => getComputedStyle(element).color);
      await field.fill('12.');
      assert.equal(await field.evaluate(element => getComputedStyle(element).color), valueColor);
      const label = f.page.locator('[data-slot="field-label"]');
      const problem = f.page.locator('[data-slot="field-error"][role="status"]');
      assert.equal(await label.evaluate(element => getComputedStyle(element).color),
        await problem.evaluate(element => getComputedStyle(element).color));
      assert.notEqual(await label.evaluate(element => getComputedStyle(element).color), valueColor);
      assert.equal(await field.getAttribute('aria-describedby'), await problem.getAttribute('id'));
      assert.deepEqual(f.errors, []);
    } finally { await f.close(); }
  });
}
