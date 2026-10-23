import assert from "node:assert/strict";
import test from "node:test";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { settleMotion } from "./web/fixture.ts";

test("specimen feedback retains the exact approved paragraph, pixels and local-only editing", async () => {
  const fixture = await svelteBrowser(`<script lang="ts">
    import Specimen from '@desert/svelte/catalog/renderer/public-catalog-bank-specimen/PublicCatalogBankSpecimen.svelte';
    const initial={version:'desert.bank-node/1',kind:'input.text',name:'writing',label:'Writing',value:'',required:false,disabled:false};
    let calls=$state(0);
  </script>
  <main style="width:420px">
    <Specimen {initial} oncatalog={()=>calls++}/><output>{calls}</output>
    <section data-reference><p role="status" class="type-support">Local writing changed. No product command was invoked.</p></section>
  </main>`);
  try {
    const { page } = fixture;
    await page.addStyleTag({ content: await rendererCss() });
    const field = page.getByRole('textbox', { name: 'Writing', exact: true });
    await field.fill('A local example'); await field.blur();
    const actual = page.locator('main > p[role="status"]'), reference = page.locator('[data-reference] p');
    await actual.waitFor();
    assert.equal(await actual.evaluate(element => element.outerHTML), await reference.evaluate(element => element.outerHTML));
    assert.deepEqual(await actual.screenshot(), await reference.screenshot(), 'Extracted owner preserves all paragraph pixels');
    assert.equal(await field.inputValue(), 'A local example');
    assert.equal(await page.locator('output').textContent(), '0', 'Writing is not a product/catalog operation');
    assert.deepEqual(fixture.errors, []);
  } finally { await fixture.close(); }
});

test("sealed specimen preserves locked transient release and close without product events", async () => {
  const fixture = await svelteBrowser(`<script lang="ts">
    import Specimen from '@desert/svelte/catalog/renderer/public-catalog-bank-specimen/PublicCatalogBankSpecimen.svelte';
    import {surfaceFrame} from '@desert/interaction/surface-frame.ts';
    const frame=surfaceFrame({version:'desert.surface-frame/6',kind:'message',top:{title:'Isolated transient'},
      content:{kind:'message',text:'A local example.'},bottom:{}});
    const initial={version:'desert.bank-node/1',kind:'transient',label:'Isolated transient',frame,open:false,locked:true};
    let calls=$state(0);
  </script><Specimen {initial} oncatalog={()=>calls++}/><output>{calls}</output>`);
  try {
    const { page } = fixture;
    await page.addStyleTag({ content: await rendererCss() });
    await page.clock.install();
    await page.getByRole('button', { name: 'Open transient example', exact: true }).click();
    const close = page.locator('.drawer').getByRole('button', { name: 'Close', exact: true });
    await close.waitFor();
    assert.equal(await close.isDisabled(), true);
    await page.clock.fastForward(2000);
    assert.equal(await close.isDisabled(), true);
    await page.clock.fastForward(1000);
    await page.waitForFunction(() => !document.querySelector<HTMLButtonElement>('.drawer button[aria-label="Close"]')?.disabled);
    await close.click(); await page.clock.fastForward(1000);
    await page.locator('.drawer').waitFor({ state: 'detached' });
    assert.equal(await page.locator('output').textContent(), '0');
    assert.deepEqual(fixture.errors, []);
  } finally { await fixture.close(); }
});

test("sealed failure adapter retains its shared problem presentation and close", async () => {
  const fixture = await svelteBrowser(`<script lang="ts">
    import FailureDialog from '@desert/svelte/catalog/renderer/failure-dialog/FailureDialog.svelte';
    let code=$state('READ_REFRESH_FAILED');
  </script><FailureDialog {code} close={()=>code=null}/>`);
  try {
    const { page } = fixture;
    await page.addStyleTag({ content: await rendererCss() });
    await page.getByRole('heading', { name: 'We couldn’t refresh the data' }).waitFor();
    assert.equal(await page.getByText('The latest data could not be loaded. Your unsent changes are preserved.').count(), 1);
    await settleMotion(page);
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('heading', { name: 'We couldn’t refresh the data' }).waitFor({ state: 'detached' });
    assert.deepEqual(fixture.errors, []);
  } finally { await fixture.close(); }
});

test("sealed control adapter retains its private file host and typed events", async () => {
  const fixture = await svelteBrowser(`<script lang="ts">
    import ControlRenderer from '@desert/svelte/catalog/renderer/control-renderer/ControlRenderer.svelte';
    import {LocalFileHost} from '@desert/svelte/infra/file-host.ts';
    import {ControlSpecimens} from '@desert/interaction/control-specimens.ts';
    import {applyControlEvent} from '@desert/interaction/control-nodes.ts';
    const host=new LocalFileHost();
    let node=$state.raw(ControlSpecimens.find(entry=>entry.id==='control.files').specimens[0].node);
    let events=$state([]), bytes=$state('');
    async function receive(event) {
      node=applyControlEvent(node,event).node; events=[...events,event.kind];
      bytes=node.files.length?await host.resolve(node.files[0].id).text():'';
    }
  </script><ControlRenderer {node} {host} onevent={receive}/><output data-events>{events.join(',')}</output><output data-bytes>{bytes}</output>`, {}, 'http://localhost/');
  try {
    const { page } = fixture;
    await page.locator('input[type="file"]').setInputFiles({ name: 'example.txt', mimeType: 'text/plain', buffer: Buffer.from('Local host bytes') });
    assert.deepEqual(fixture.errors, []);
    await page.getByRole('button', { name: 'Remove example.txt' }).waitFor();
    await page.waitForFunction(() => document.querySelector('[data-bytes]')?.textContent === 'Local host bytes');
    assert.equal(await page.locator('[data-events]').textContent(), 'files.choose');
    await page.getByRole('button', { name: 'Remove example.txt' }).click();
    assert.equal(await page.locator('[data-events]').textContent(), 'files.choose,files.remove');
    assert.equal(await page.locator('[data-bytes]').textContent(), '');
    assert.deepEqual(fixture.errors, []);
  } finally { await fixture.close(); }
});
