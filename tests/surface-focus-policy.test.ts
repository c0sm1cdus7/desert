import assert from 'node:assert/strict';
import test from 'node:test';
import { svelteBrowser } from './fixtures/svelte-browser.ts';
import { rendererCss } from './fixtures/renderer-css.ts';

test('repeated autofocus callbacks install only one boundary navigation handler', async () => {
  const f = await svelteBrowser(`<script>
    import { surfaceFocus } from '@desert/svelte/infra/surface-focus.svelte.ts';
    let surface=$state(null), received=$state(0);
    const first=surfaceFocus(()=>surface), second=surfaceFocus(()=>surface);
  </script><button onclick={()=>{first(new Event('open'));second(new Event('open'))}}>Open</button>
    <div bind:this={surface} tabindex="-1"><div role="listbox" aria-label="Choices">
      <button role="option" aria-selected="true" onkeydown={()=>received++}>First</button>
    </div></div><output>{received}</output>`);
  try {
    await f.page.getByRole('button',{name:'Open',exact:true}).click();
    await f.page.keyboard.press('g');
    assert.equal(await f.page.locator('output').textContent(),'1');
    assert.equal(await f.page.getByRole('option').evaluate(element=>element===document.activeElement),true);
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});

test('hidden and disabled fields never intercept keyboard entry into a surface', async () => {
  const f = await svelteBrowser(`<script>
    import * as Dialog from '@desert/svelte/vendor/components/ui/dialog/index.js';
    import * as Popover from '@desert/svelte/vendor/components/ui/popover/index.js';
    </script>
    <Dialog.Root><Dialog.Trigger>Open dialog</Dialog.Trigger><Dialog.Content>
      <Dialog.Title>Form</Dialog.Title><input type="hidden"/><input disabled/>
      <div hidden><input/></div><input aria-label="Visible field"/>
    </Dialog.Content></Dialog.Root>
    <Popover.Root><Popover.Trigger>Open popover</Popover.Trigger><Popover.Content role="dialog">
      <input type="hidden"/><button>Visible action</button>
    </Popover.Content></Popover.Root>`);
  try {
    await f.page.addStyleTag({content:await rendererCss()});
    await f.page.emulateMedia({reducedMotion:'reduce'});
    for (const [kind, expected] of [['dialog','Visible field'],['popover','Visible action']]) {
      await f.page.getByRole('button',{name:`Open ${kind}`,exact:true}).focus();
      await f.page.keyboard.press('Enter');
      await f.page.waitForFunction(expected => {
        const active = document.activeElement;
        return active?.getAttribute('aria-label') === expected || active?.textContent === expected;
      }, expected);
      assert.equal(await f.page.getByRole('dialog').evaluate(el=>el.contains(document.activeElement)),true);
      await f.page.keyboard.press('Escape');
      await f.page.getByRole('dialog').waitFor({state:'hidden'});
    }
    assert.deepEqual(f.errors,[]);
  } finally { await f.close(); }
});

test('an unselected sheet enters its first enabled option before toolbar actions', async () => {
  const f = await svelteBrowser(`<script>
    import SelectionField from '@desert/svelte/catalog/foundations/selection-field/SelectionField.svelte';
    </script><SelectionField selection="example" label="Choose" value={null}
      options={[{value:'unavailable',label:'Unavailable',disabled:true},{value:'first',label:'First'},
      {value:'second',label:'Second'}]} onchange={()=>{}}/>`);
  try {
    await f.page.addStyleTag({content:await rendererCss()});
    await f.page.setViewportSize({width:320,height:700});
    await f.page.emulateMedia({reducedMotion:'reduce'});
    await f.page.getByRole('button',{name:'Choose',exact:true}).focus();
    await f.page.keyboard.press('Enter');
    await f.page.waitForFunction(()=>document.activeElement?.getAttribute('role')==='option');
    assert.match(await f.page.locator(':focus').innerText(),/First/);
    await f.page.keyboard.press('ArrowDown');
    assert.match(await f.page.locator(':focus').innerText(),/Second/);
    assert.deepEqual(f.errors,[]);
  } finally { await f.close(); }
});
