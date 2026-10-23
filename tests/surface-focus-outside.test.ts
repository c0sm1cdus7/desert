import assert from 'node:assert/strict';
import test from 'node:test';
import { svelteBrowser } from './fixtures/svelte-browser.ts';

const settle=async(f:Awaited<ReturnType<typeof svelteBrowser>>)=>f.page.evaluate(()=>
  new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));

test('selection observes a real outside focus transfer during its opening microtask',async()=>{
  const f=await svelteBrowser(`<script>
    import SelectionField from '@desert/svelte/pieces/SelectionField.svelte';
    let changes=$state(0);
  </script><SelectionField selection="choice" label="Choice" value="first"
    options={[{value:'first',label:'First'}]} onchange={()=>changes++}/>
  <input aria-label="Other field"/><output>{changes}</output>`);
  try{
    await f.page.evaluate(()=>document.addEventListener('focusin',event=>{
      if(event.target instanceof HTMLElement&&event.target.matches('[data-slot="popover-content"]')){
        queueMicrotask(()=>document.querySelector<HTMLInputElement>('input')!.focus());
      }
    },true));
    await f.page.getByRole('button',{name:'Choice',exact:true}).click();
    await settle(f);
    assert.equal(await f.page.getByRole('listbox').count(),0,'No focus transition is lost while the surface opens');
    assert.ok(await f.page.getByRole('textbox',{name:'Other field',exact:true}).evaluate(element=>element===document.activeElement));
    assert.equal(await f.page.locator('output').textContent(),'0');
    assert.deepEqual(f.errors,[]);
  }finally{await f.close();}
});

test('outside focus is delivered once per native transfer and preserves custom ownership across reopen',async()=>{
  const f=await svelteBrowser(`<script>
    import * as Popover from '@desert/svelte/vendor/components/ui/popover/index.js';
    let open=$state(false),events=$state(0),closes=$state(0),allow=$state(false);
    globalThis.allowOutside=()=>allow=true;
  </script><Popover.Root bind:open><Popover.Trigger>Open</Popover.Trigger>
    <Popover.Content role="dialog" aria-label="Content" onFocusOutside={()=>{events++;if(allow)open=false;}}
      onCloseAutoFocus={event=>{closes++;event.preventDefault();}}><button>Inside</button></Popover.Content>
  </Popover.Root><input aria-label="Other field"/><output>{events}:{closes}</output>`);
  try{
    const trigger=f.page.getByRole('button',{name:'Open',exact:true}),outside=f.page.getByRole('textbox',{name:'Other field',exact:true});
    await trigger.click();await f.page.getByRole('dialog').waitFor();
    await outside.focus();await settle(f);
    assert.equal(await f.page.locator('output').textContent(),'1:0');
    assert.equal(await f.page.getByRole('dialog').count(),1,'Custom outside callback may keep its surface open');
    await f.page.getByRole('button',{name:'Inside',exact:true}).focus();await settle(f);
    assert.equal(await f.page.locator('output').textContent(),'1:0','Inside movement is not an outside event');
    await f.page.evaluate(()=>{(globalThis as any).allowOutside();});
    await outside.focus();await f.page.getByRole('dialog').waitFor({state:'hidden'});await settle(f);
    assert.equal(await f.page.locator('output').textContent(),'2:1');
    assert.ok(await outside.evaluate(element=>element===document.activeElement));
    await trigger.click();await f.page.getByRole('dialog').waitFor();
    await f.page.keyboard.press('Escape');await f.page.getByRole('dialog').waitFor({state:'hidden'});await settle(f);
    assert.equal(await f.page.locator('output').textContent(),'2:2','Escape is not an outside-focus callback');
    await outside.focus();await settle(f);
    assert.equal(await f.page.locator('output').textContent(),'2:2','Closed scopes have no live outside listener');
    await trigger.click();await f.page.getByRole('dialog').waitFor();
    await outside.focus();await f.page.getByRole('dialog').waitFor({state:'hidden'});await settle(f);
    assert.equal(await f.page.locator('output').textContent(),'3:3');
    assert.deepEqual(f.errors,[]);
  }finally{await f.close();}
});

test('a portaled child belongs to its parent focus scope, while an unrelated sibling does not',async()=>{
  const f=await svelteBrowser(`<script>
    import * as Popover from '@desert/svelte/vendor/components/ui/popover/index.js';
    let parent=$state(false),child=$state(false),sibling=$state(false),exits=$state(0);
  </script><Popover.Root bind:open={parent}><Popover.Trigger>Parent</Popover.Trigger>
    <Popover.Content role="dialog" aria-label="Parent content" onFocusOutside={()=>{exits++;parent=false;}}>
      <Popover.Root bind:open={child}><Popover.Trigger>Child</Popover.Trigger>
        <Popover.Content role="dialog" aria-label="Child content"><button>Child action</button></Popover.Content>
      </Popover.Root>
    </Popover.Content>
  </Popover.Root><Popover.Root bind:open={sibling}><Popover.Trigger>Sibling</Popover.Trigger>
    <Popover.Content role="dialog" aria-label="Sibling content"><button>Sibling action</button></Popover.Content>
  </Popover.Root><output>{exits}</output>`);
  try{
    await f.page.getByRole('button',{name:'Parent',exact:true}).click();
    await f.page.getByRole('dialog',{name:'Parent content',exact:true}).waitFor();await settle(f);
    await f.page.getByRole('button',{name:'Child',exact:true}).click();await settle(f);
    assert.equal(await f.page.getByRole('dialog',{name:'Child content',exact:true}).count(),1);
    assert.equal(await f.page.getByRole('dialog',{name:'Parent content',exact:true}).count(),1);
    assert.equal(await f.page.locator('output').textContent(),'0','Portaled descendant focus does not leave the parent scope');
    await f.page.getByRole('button',{name:'Child action',exact:true}).focus();await settle(f);
    assert.equal(await f.page.locator('output').textContent(),'0');
    await f.page.keyboard.press('Escape');await f.page.getByRole('dialog',{name:'Child content',exact:true}).waitFor({state:'hidden'});
    assert.ok(await f.page.getByRole('button',{name:'Child',exact:true}).evaluate(element=>element===document.activeElement));
    await f.page.getByRole('button',{name:'Sibling',exact:true}).click();
    await f.page.getByRole('dialog',{name:'Sibling content',exact:true}).waitFor();await settle(f);
    assert.equal(await f.page.getByRole('dialog',{name:'Parent content',exact:true}).count(),0);
    assert.ok(await f.page.getByRole('dialog',{name:'Sibling content',exact:true}).evaluate(element=>element.contains(document.activeElement)));
    assert.equal(await f.page.locator('output').textContent(),'1');
    assert.deepEqual(f.errors,[]);
  }finally{await f.close();}
});

test('a nested picker sheet retains its parent popover and restores the inner opener',async()=>{
  const f=await svelteBrowser(`<script>
    import * as Popover from '@desert/svelte/vendor/components/ui/popover/index.js';
    import PickerSheet from '@desert/svelte/pieces/PickerSheet.svelte';
    let parent=$state(false),sheet=$state(false),exits=$state(0);
  </script><Popover.Root bind:open={parent}><Popover.Trigger>Parent</Popover.Trigger>
    <Popover.Content role="dialog" aria-label="Parent content" onFocusOutside={()=>{exits++;parent=false;}}>
      <button id="sheet-opener" onclick={()=>sheet=true}>Open sheet</button>
      <PickerSheet bind:open={sheet} label="Nested picker" triggerId="sheet-opener">
        <button>Picker action</button>
      </PickerSheet>
    </Popover.Content>
  </Popover.Root><output>{exits}</output>`);
  try{
    await f.page.setViewportSize({width:390,height:844});
    await f.page.getByRole('button',{name:'Parent',exact:true}).click();
    await f.page.getByRole('dialog',{name:'Parent content',exact:true}).waitFor();await settle(f);
    await f.page.getByRole('button',{name:'Open sheet',exact:true}).click();await settle(f);
    assert.equal(await f.page.getByRole('dialog',{name:'Nested picker',exact:true}).count(),1);
    assert.equal(await f.page.locator('[data-slot="popover-content"][data-state="open"]').count(),1,
      'Modal child accessibility hiding does not dismiss the parent');
    await f.page.getByRole('button',{name:'Picker action',exact:true}).focus();await settle(f);
    assert.equal(await f.page.locator('output').textContent(),'0');
    await f.page.keyboard.press('Escape');
    await f.page.getByRole('dialog',{name:'Nested picker',exact:true}).waitFor({state:'hidden'});
    await settle(f);
    assert.ok(await f.page.getByRole('button',{name:'Open sheet',exact:true}).evaluate(element=>element===document.activeElement));
    assert.equal(await f.page.getByRole('dialog',{name:'Parent content',exact:true}).count(),1);
    assert.equal(await f.page.locator('output').textContent(),'0');
    assert.deepEqual(f.errors,[]);
  }finally{await f.close();}
});

for(const childKind of ['popover','sheet'] as const) test(`closing a parent with focus in its portaled ${childKind} restores the parent opener`,async()=>{
  const f=await svelteBrowser(`<script>
    import * as Popover from '@desert/svelte/vendor/components/ui/popover/index.js';
    import PickerSheet from '@desert/svelte/pieces/PickerSheet.svelte';
    let parent=$state(false),child=$state(false);
    globalThis.hideParent=()=>parent=false;
  </script><Popover.Root bind:open={parent}><Popover.Trigger>Parent</Popover.Trigger>
    <Popover.Content role="dialog" aria-label="Parent content">
      ${childKind==='popover'?`
      <Popover.Root bind:open={child}><Popover.Trigger>Child</Popover.Trigger>
        <Popover.Content role="dialog" aria-label="Child content"><button>Child action</button></Popover.Content>
      </Popover.Root>
      `:`<button id="sheet-opener" onclick={()=>child=true}>Child</button>
      <PickerSheet bind:open={child} label="Child content" triggerId="sheet-opener"><button>Child action</button></PickerSheet>`}
    </Popover.Content>
  </Popover.Root>`);
  try{
    await f.page.getByRole('button',{name:'Parent',exact:true}).click();
    await f.page.getByRole('dialog',{name:'Parent content',exact:true}).waitFor();await settle(f);
    await f.page.getByRole('button',{name:'Child',exact:true}).click();await settle(f);
    await f.page.getByRole('button',{name:'Child action',exact:true}).focus();
    await f.page.evaluate(()=>{(globalThis as any).hideParent();});
    await f.page.getByRole('dialog',{name:'Parent content',exact:true}).waitFor({state:'hidden'});
    await f.page.getByRole('dialog',{name:'Child content',exact:true}).waitFor({state:'hidden'});await settle(f);
    assert.ok(await f.page.getByRole('button',{name:'Parent',exact:true}).evaluate(element=>element===document.activeElement),
      'Closing the semantic focus owner returns to its opener, not BODY');
    assert.deepEqual(f.errors,[]);
  }finally{await f.close();}
});

for(const explicit of ['parent-cancel','child-outside'] as const) test(`nested close respects ${explicit} focus ownership`,async()=>{
  const f=await svelteBrowser(`<script>
    import * as Popover from '@desert/svelte/vendor/components/ui/popover/index.js';
    let parent=$state(false),child=$state(false),outside;
    globalThis.hideParent=()=>parent=false;
  </script><Popover.Root bind:open={parent}><Popover.Trigger>Parent</Popover.Trigger>
    <Popover.Content role="dialog" aria-label="Parent content"
      ${explicit==='parent-cancel'?'onCloseAutoFocus={event=>event.preventDefault()}':''}>
      <Popover.Root bind:open={child}><Popover.Trigger>Child</Popover.Trigger>
        <Popover.Content role="dialog" aria-label="Child content"
          ${explicit==='child-outside'?'onCloseAutoFocus={event=>{event.preventDefault();outside.focus();}}':''}>
          <button>Child action</button>
        </Popover.Content>
      </Popover.Root>
    </Popover.Content>
  </Popover.Root><button bind:this={outside}>Outside</button>`);
  try{
    await f.page.getByRole('button',{name:'Parent',exact:true}).click();
    await f.page.getByRole('dialog',{name:'Parent content',exact:true}).waitFor();await settle(f);
    await f.page.getByRole('button',{name:'Child',exact:true}).click();await settle(f);
    await f.page.getByRole('button',{name:'Child action',exact:true}).focus();
    await f.page.evaluate(()=>{(globalThis as any).hideParent();});
    await f.page.getByRole('dialog',{name:'Parent content',exact:true}).waitFor({state:'hidden'});
    await f.page.getByRole('dialog',{name:'Child content',exact:true}).waitFor({state:'hidden'});await settle(f);
    assert.equal(await f.page.getByRole('button',{name:'Parent',exact:true}).evaluate(element=>element===document.activeElement),false);
    if(explicit==='child-outside') assert.ok(await f.page.getByRole('button',{name:'Outside',exact:true}).evaluate(element=>element===document.activeElement));
    assert.deepEqual(f.errors,[]);
  }finally{await f.close();}
});
