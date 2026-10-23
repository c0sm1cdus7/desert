import test from "node:test";
import assert from "node:assert/strict";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

const source = `<script lang="ts">
  import AnchoredSurface from '@desert/svelte/catalog/compositions/popover-control/AnchoredSurface.svelte';
  import SelectionField from '@desert/svelte/catalog/foundations/selection-field/SelectionField.svelte';
  import { toolbarAction } from '@desert/interaction/toolbar.ts';
  let open=$state(false), value=$state('one');
</script>
<main style="padding:100px 24px">
  <SelectionField selection="example" label="Choose" {value} onchange={next=>value=next}
    options={[{value:'one',label:'One',disabled:false},{value:'two',label:'Two',disabled:false}]} />
  <AnchoredSurface label="Open actions" title="Actions" {open} onchange={next=>open=next}
    content={{kind:'utilities',actions:[toolbarAction({kind:'journey',journey:'first'},'First','open'),toolbarAction({kind:'journey',journey:'last'},'Last','open')]}} />
  <button>Outside target</button>
</main>`;

test("select and contextual popover share one floating material with opaque accessibility fallback", async () => {
  const f=await svelteBrowser(source);
  try {
    await f.page.addStyleTag({content:await rendererCss()});
    const media=await f.page.context().newCDPSession(f.page);
    for(const profile of ['default','apple-reference']) for(const preference of ['no-preference','reduce']) {
      await f.page.evaluate(profile=>document.documentElement.dataset.rendererProfile=profile,profile);
      await media.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'},
        {name:'prefers-reduced-transparency',value:preference}]});
      const materials=[];
      for(const trigger of ['Choose','Open actions']) {
        await f.page.getByRole('button',{name:trigger,exact:true}).click();
        const panel=f.page.locator('.floating-pane'); await panel.waitFor();
        materials.push(await panel.evaluate(element=>{const css=getComputedStyle(element);
          const ctx=new OffscreenCanvas(1,1).getContext('2d')!;ctx.fillStyle=css.backgroundColor;ctx.fillRect(0,0,1,1);
          return {alpha:ctx.getImageData(0,0,1,1).data[3],blur:css.backdropFilter,color:css.color,
            background:css.backgroundColor,radius:css.borderRadius,animation:css.animationName};}));
        assert.equal(await f.page.locator('.scrim,[aria-modal="true"]').count(),0);
        await f.page.keyboard.press('Escape'); await panel.waitFor({state:'hidden'});
      }
      assert.deepEqual(materials[0],materials[1]);
      const material=materials[0]!;
      assert.equal(material.animation,'none');
      if(preference==='reduce') {assert.equal(material.alpha,255);assert.equal(material.blur,'none');}
      else {assert.ok(material.alpha!>180 && material.alpha!<255);assert.match(material.blur,/blur\(24px\)/);}
    }
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});

test("a nonmodal utility popover dismisses when Tab or ShiftTab leaves without wrapping focus",async()=>{
  const f=await svelteBrowser(source);
  try {
    for(const [action,key] of [['Last','Tab'],['First','Shift+Tab']] as const) {
      await f.page.getByRole('button',{name:'Open actions',exact:true}).press('Enter');
      const panel=f.page.getByRole('dialog',{name:'Actions',exact:true});await panel.waitFor();
      assert.equal(await f.page.getByRole('button',{name:'Open actions',exact:true}).getAttribute('aria-controls'),
        await panel.getAttribute('id'), "the trigger identifies its actual floating surface");
      await f.page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='First');
      await f.page.keyboard.press('Tab');
      assert.equal(await panel.isVisible(),true,"Tab between interior actions does not dismiss");
      assert.equal(await panel.getByRole('button',{name:'Last',exact:true}).evaluate(node=>node===document.activeElement),true);
      await panel.getByRole('button',{name:action,exact:true}).focus();
      await f.page.keyboard.press(key!);
      await panel.waitFor({state:'hidden'});
      assert.equal(await f.page.evaluate(()=>!!document.activeElement?.closest('[data-popover-content]')),false);
      const destination = key === 'Tab' ? 'Outside target' : 'Open actions';
      assert.equal(await f.page.getByRole('button',{name:destination,exact:true}).evaluate(node=>node===document.activeElement),true);
    }
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});
