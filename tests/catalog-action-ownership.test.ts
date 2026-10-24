import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { resolvedNode, ResolvedNodeVersion as version } from "../src/interaction/resolved-node.ts";
import { workspaceBodySource } from "./fixtures/workspace-body.ts";

const css = rendererCss();
const source = `<script lang="ts">
  import CatalogWorkspace from "@desert/svelte/catalog/compositions/catalog-workspace/CatalogWorkspace.svelte";
  import NodeRenderer from "@desert/svelte/catalog/renderer/node-renderer/NodeRenderer.svelte";
  ${workspaceBodySource()}
  let events = $state([]);
  const record = 'mountain';
  const node = {version:'desert.bank-node/1',kind:'action',role:'primary',action:{label:'Learn More',icon:'open',
    state:'ready',intent:{kind:'catalog.open',record}}};
</script>
<CatalogWorkspace navigationSurface={{title:'Explorer',settingsPlaceholder:true}} title="Explorer" identity={{title:'Explorer',subtitle:'Explore places.'}}
  navigation={[{id:'browse',label:'Explore'}]} active="browse" searching={false} onsearch={()=>{}} oncancel={()=>{}}
  query="" onquery={() => {}} onnavigate={() => {}} detail onback={() => events = [...events,{kind:'catalog.back'}]}
  content={workspaceBody} />
<aside data-standalone-action style="position:fixed;left:2rem;top:10rem;z-index:1">
  <NodeRenderer {node} onevent={event=>events=[...events,event]} />
</aside>
<output hidden data-events>{JSON.stringify(events)}</output>`;

test("catalog action intents stay closed and cannot become business submissions or primary dismissal", () => {
  const action = { version, kind: "action", role: "primary", action: {
    label: "Learn More", icon: "open", state: "ready", intent: { kind: "catalog.open", record: "mountain" },
  } };
  assert.deepEqual(resolvedNode(action), action);
  assert.throws(() => resolvedNode({ ...action, form: true }), /INVALID_BANK_ACTION/);
  assert.throws(() => resolvedNode({ ...action, action: { ...action.action, intent: { kind: "catalog.back" } } }), /INVALID_BANK_ACTION/);
  assert.throws(() => resolvedNode({ ...action, action: { ...action.action, intent: { kind: "catalog.search", query: "forest" } } }), /INVALID_BANK_NODE/);
  assert.throws(() => resolvedNode({ ...action, action: { ...action.action, intent: { kind: "catalog.open", record: "mountain", onclick() {} } } }), /JSON|INVALID_BANK_NODE/);
});

test("catalog CTA and Back use the shared Action owner, preserving adaptive faces and reference geometry", async () => {
  const f = await svelteBrowser(source);
  try {
    await f.page.addStyleTag({ content: await css });
    await f.page.setViewportSize({ width: 900, height: 450 });
    const cta = f.page.getByRole("button", { name: "Learn More", exact: true });
    const back = f.page.getByRole("button", { name: "Back", exact: true });
    for (const button of [cta, back]) assert.equal(await button.getAttribute("data-action"), "");
    await f.page.waitForFunction(() => document.querySelector('[aria-label="Back"]')?.getAttribute('data-action-face') === 'icon');
    assert.equal(await cta.getAttribute("data-action-face"), "label");
    assert.equal(await cta.evaluate(element => getComputedStyle(element).borderRadius), "14px",
      "the catalog cannot override the shared radius (one radius family)");
    assert.ok((await cta.boundingBox())!.height >= 44, 'catalog actions retain the shared accessible target');
    await cta.click(); await back.click();
    assert.deepEqual(JSON.parse(await f.page.locator('[data-events]').textContent() ?? ''),
      [{ kind: 'catalog.open', record: 'mountain' }, { kind: 'catalog.back' }]);
    await f.page.setViewportSize({ width: 390, height: 844 });
    assert.ok((await cta.boundingBox())!.height >= 44);
    assert.ok((await back.boundingBox())!.height >= 44 && (await back.boundingBox())!.width >= 44);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("replacing the bank's single Action renderer reaches both catalog consumers and retains pending suppression", async () => {
  const owner = resolve(import.meta.dirname, "../src/svelte/catalog/foundations/action/Action.svelte");
  const f = await svelteBrowser(source, { [owner]: `<script lang="ts">
    let {label,icon,onclick} = $props();
  </script><button data-shared-action-replacement data-icon={icon} aria-label={label} onclick={onclick}>{label}</button>` });
  try {
    for (const label of ['Learn More', 'Back'])
      assert.equal(await f.page.getByRole('button', {name:label,exact:true}).getAttribute('data-shared-action-replacement'), '');
    assert.equal(await f.page.getByRole('button', {name:'Learn More',exact:true}).getAttribute('data-icon'), 'open');
    assert.equal(await f.page.getByRole('button', {name:'Back',exact:true}).getAttribute('data-icon'), 'back');
    await f.page.getByRole('button', {name:'Learn More',exact:true}).click();
    await f.page.getByRole('button', {name:'Back',exact:true}).click();
    assert.deepEqual(JSON.parse(await f.page.locator('[data-events]').textContent() ?? ''),
      [{kind:'catalog.open',record:'mountain'}, {kind:'catalog.back'}]);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
  const pending = await svelteBrowser(`<script lang="ts">
    import NodeRenderer from "@desert/svelte/catalog/renderer/node-renderer/NodeRenderer.svelte";
    let events = $state([]);
    const node = {version:'desert.bank-node/1',kind:'action',role:'primary',action:{label:'Opening',icon:'open',
      state:'pending',intent:{kind:'catalog.open',record:'mountain'}}};
  </script><NodeRenderer {node} onevent={event => events = [...events,event]} /><output>{JSON.stringify(events)}</output>`);
  try {
    const button = pending.page.getByRole('button', {name:'Opening',exact:true});
    assert.equal(await button.isDisabled(), true);
    assert.equal(await button.getAttribute('aria-busy'), 'true');
    assert.equal(await button.getAttribute('data-action-face'), 'pending');
    await button.dispatchEvent('click');
    assert.equal(await pending.page.locator('output').textContent(), '[]');
    assert.deepEqual(pending.errors, []);
  } finally { await pending.close(); }
});
