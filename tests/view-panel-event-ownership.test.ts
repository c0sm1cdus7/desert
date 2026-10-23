import test from "node:test";
import assert from "node:assert/strict";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { settleMotion } from "./web/fixture.ts";

test("detached editor blur and submit retain their old owner while the outer Drawer stays mounted", async () => {
  const fixture = await svelteBrowser(`<script lang="ts">
    import Panel from '@desert/svelte/catalog/renderer/panel/Panel.svelte';
    import AdaptiveSurfaceLayout from '@desert/svelte/catalog/compositions/catalog-workspace/AdaptiveSurfaceLayout.svelte';
    import { surfaceFrame } from '@desert/interaction/surface-frame.ts';
    import { viewEventOwnership } from '@desert/web/client/view-events.ts';
    const ownership = viewEventOwnership();
    let generation=$state(1), value=$state('First'), accepted=$state(0), rejected=$state(0);
    let owner=$derived(ownership.sync([generation], true).panel);
    let frame=$derived(surfaceFrame({version:'desert.surface-frame/6',kind:'journey',top:{title:'Editor'},
      content:{kind:'form',submit:'save',fields:[{name:'title',label:'Title',primitive:'input.text',value,required:false}]},
      bottom:{primary:{intent:{kind:'journey',journey:'save'},label:'Save',icon:'save',state:'ready'}}}));
    function receive(envelope) {
      const event=ownership.read(envelope);
      if(!event) { rejected++; return; }
      if(event.kind==='input.change') value=event.value;
      else if(event.kind==='surface.invoke') accepted++;
    }
  </script>
  <AdaptiveSurfaceLayout>
    <button onclick={()=>{generation++;value='Second';}}>Replace editor</button>
    <output data-writing>{value}</output><output data-accepted>{accepted}</output><output data-rejected>{rejected}</output>
    <Panel panel={{frame,label:'Editor',locked:false,owner}} onevent={receive}/>
  </AdaptiveSurfaceLayout>`);
  try {
    const { page } = fixture;
    await page.setViewportSize({ width: 1600, height: 844 });
    await page.addStyleTag({ content: await rendererCss() });
    const pane = page.locator('.drawer');
    await pane.waitFor(); await settleMotion(page);
    const host = await pane.elementHandle(), oldInput = await pane.getByRole('textbox', { name: 'Title' }).elementHandle();
    const oldForm = await pane.locator('form').elementHandle();
    await page.getByRole('button', { name: 'Replace editor' }).click();
    await page.waitForFunction(() => document.querySelector<HTMLInputElement>('input[aria-label="Title"]')?.value === 'Second');
    assert.equal(await host!.evaluate(node => node === document.querySelector('.drawer')), true);
    assert.equal(await oldInput!.evaluate(node => node.isConnected), false);
    await oldInput!.evaluate((node: HTMLInputElement) => {
      node.value = 'Late first editor'; node.dispatchEvent(new FocusEvent('blur'));
    });
    await oldForm!.evaluate(node => node.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    assert.equal(await page.locator('[data-writing]').textContent(), 'Second');
    assert.equal(await page.locator('[data-accepted]').textContent(), '0');
    assert.equal(await page.locator('[data-rejected]').textContent(), '2');
    await pane.getByRole('textbox', { name: 'Title' }).fill('Current writing');
    await pane.getByRole('textbox', { name: 'Title' }).press('Enter');
    assert.equal(await page.locator('[data-writing]').textContent(), 'Current writing');
    assert.equal(await page.locator('[data-accepted]').textContent(), '1');
    assert.equal(await pane.evaluate(node => node.getAnimations().length), 0, 'Replacement does not replay outer entry');
    assert.deepEqual(fixture.errors, []);
  } finally { await fixture.close(); }
});
