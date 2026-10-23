import assert from "node:assert/strict";
import test from "node:test";
import type { Locator } from "playwright";
import { BankVersion, bankNode } from "../src/interaction/bank-node.ts";
import { compilePublicCatalog } from "../src/public-catalog/index.ts";
import { publicCatalogBankInventory } from "../src/svelte/infra/PublicCatalogBank-model.ts";
import { catalogFixture } from "./fixtures/public-catalog.ts";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

async function descriptions(control: Locator) {
  return control.evaluate(element => (element.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean).map(id => {
    const description = document.getElementById(id);
    return { text: description?.textContent?.trim(), owned: description?.closest('[data-slot="field"]') === element.closest('[data-slot="field"]') };
  }));
}

test("input helpers belong to each field and join errors/counters in every input branch", { timeout: 90000 }, async () => {
  const f = await svelteBrowser(`<script lang="ts">
    import TextInput from '@desert/svelte/catalog/foundations/text-input/TextInput.svelte';
    let helper = $state('Use a recognizable name.');
  </script>
  <TextInput primitive="input.text" label="Name" {helper} error="Name is unavailable." onchange={()=>{}}/>
  <TextInput primitive="input.text" label="Decimal" value="2" mask={{kind:'decimal',locale:'en-US',scale:2}}
    helper="Use up to two decimal places." error="Amount is unavailable." onchange={()=>{}}/>
  <TextInput primitive="input.multiline" label="Description" value="Hello" maxLength={20}
    helper="Describe the image." error="Description needs attention." onchange={()=>{}}/>
  <TextInput primitive="input.text" label="Without helper" onchange={()=>{}}/>
  <button onclick={()=>helper=''}>Remove helper</button>`);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    for (const [label, expected] of [
      ["Name", ["Use a recognizable name.", "Name is unavailable."]],
      ["Decimal", ["Use up to two decimal places.", "Amount is unavailable."]],
      ["Description", ["Describe the image.", "15 remaining", "Description needs attention."]],
    ] as const) {
      const items = await descriptions(f.page.getByLabel(label, { exact: true }));
      assert.deepEqual(items.map(item => item.text), expected);
      assert.ok(items.every(item => item.owned), `${label} description must be owned by its field`);
    }
    assert.equal(await f.page.getByLabel("Without helper", { exact: true }).getAttribute("aria-describedby"), null);
    await f.page.getByRole("button", { name: "Remove helper", exact: true }).click();
    assert.deepEqual(await descriptions(f.page.getByLabel("Name", { exact: true })), [{ text: "Name is unavailable.", owned: true }]);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("the closed bank carries helper copy and both input specimens demonstrate it", { timeout: 90000 }, async () => {
  const base = { version: BankVersion, name: "example", label: "Example", value: "", required: false, disabled: false };
  for (const kind of ["input.text", "input.multiline"] as const) {
    const node = { ...base, kind, helper: "This guidance belongs to the input." };
    assert.deepEqual(bankNode(node), node);
    for (const helper of ["", 1, { text: "not plain text" }]) assert.throws(() => bankNode({ ...node, helper }), /INVALID_BANK_NODE/);
  }
  const inventory = publicCatalogBankInventory(compilePublicCatalog(catalogFixture()).surface);
  for (const item of inventory.filter(item => item.id === "input.text" || item.id === "input.multiline")) {
    assert.ok(item.node && "helper" in item.node && typeof item.node.helper === "string" && item.node.helper.length > 0);
  }
  const f = await svelteBrowser(`<script lang="ts">
    import BankRenderer from '@desert/svelte/catalog/renderer/bank-renderer/BankRenderer.svelte';
    const base = ${JSON.stringify(base)};
  </script>{#each ['input.text','input.multiline'] as kind}
    <BankRenderer node={{...base, kind, label:kind, helper:'Field-specific guidance.'}} onevent={()=>{}}/>
  {/each}`);
  try {
    for (const label of ["input.text", "input.multiline"]) {
      const items = await descriptions(f.page.getByLabel(label, { exact: true }));
      assert.deepEqual(items[0], { text: "Field-specific guidance.", owned: true });
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("onboarding places constraints at their inputs and leaves general context in its subtitle", { timeout: 90000 }, async () => {
  const f = await svelteBrowser(`<script lang="ts">
    import AccessForm from '@desert/svelte/catalog/compositions/access-form/AccessForm.svelte';
    let mode = $state<'initialize'|'signIn'>('initialize');
  </script><AccessForm {mode} onsubmit={async()=>{}}/><button onclick={()=>mode='signIn'}>Show unlock</button>`);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    await f.page.setViewportSize({ width: 320, height: 844 });
    assert.equal(await f.page.locator(".access-intro").textContent(), "Create your identity to access VOID.");
    assert.deepEqual(await descriptions(f.page.getByLabel("Identity name", { exact: true })), [
      { text: "3–64 lowercase letters, numbers, dots, hyphens or underscores.", owned: true },
    ]);
    assert.deepEqual(await descriptions(f.page.getByLabel("Password", { exact: true })), [
      { text: "At least 12 characters. Keep the password safe; recovery is not available yet.", owned: true },
    ]);
    assert.equal(await f.page.locator('.access-form [data-slot="field-description"]').count(), 2);
    assert.equal(await f.page.getByText(/Use a lowercase identity name/).count(), 0);
    assert.equal(await f.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await f.page.getByRole("button", { name: "Show unlock", exact: true }).click();
    assert.equal(await f.page.locator('.access-form [data-slot="field-description"]').count(), 0);
    assert.equal(await f.page.getByLabel("Password", { exact: true }).getAttribute("autocomplete"), "current-password");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
