import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { finiteInputsBefore } from "./fixtures/finite-inputs-before.ts";

const fixture = (before: boolean) => `<script lang="ts">
  import Place from '@desert/svelte/catalog/foundations/place/Place.svelte';
  import SearchField from '@desert/svelte/catalog/foundations/search-field/SearchField.svelte';
  import MaskedInput from '@desert/svelte/catalog/foundations/masked-input/MaskedInput.svelte';
  import MeasuredField from '@desert/svelte/catalog/foundations/measured-field/MeasuredField.svelte';
  import FieldWell from '@desert/svelte/catalog/foundations/field-well/FieldWell.svelte';
  let query=$state('first'), value=$state('1234.50'), disabled=$state(false), readonly=$state(false), searching=$state(false), composing=$state(false);
  const mask={kind:'decimal',locale:'en-US',scale:2};
</script>
<div data-fixture style="height:600px;position:relative">
<Place ${before ? 'role="main" data-catalog-content data-destination="notes" tabindex={-1} aria-label="Notes" oncompositionstart={()=>composing=true} oncompositionend={()=>composing=false} viewportAttributes={{"data-catalog-scroll":"",tabindex:-1,inert:searching,"aria-hidden":searching?"true":undefined}}'
  : 'landmark="main" destination="notes" label="Notes" {searching} oncomposition={active=>composing=active}'}>
  {#snippet top()}<div>
    <button onclick={()=>disabled=!disabled}>Disable</button><button onclick={()=>readonly=!readonly}>Readonly</button><button onclick={()=>searching=!searching}>Overlay</button>
  </div>{/snippet}
  {#snippet content()}
    <SearchField id="find" bind:value={query} {disabled} {readonly} aria-label="Find" placeholder="Find things"/>
    <MeasuredField ${before ? 'measure="writing" data-primitive="input.text" data-disabled={disabled} data-invalid={false}' : 'kind="input.text" {disabled} invalid={false}'}>
      <FieldWell id="amount" label="Amount" filled={true} required={true}>
        <MaskedInput id="amount" {mask} {value} {disabled} required={true} aria-required={true} aria-invalid={false}
          aria-label="Amount" ${before ? 'class="focus-visible:outline-none"' : ''} onvalue={next=>value=next}/>
      </FieldWell>
    </MeasuredField>
    <output>{query}/{value}/{String(composing)}</output><div style="height:900px">Long content</div>
  {/snippet}
</Place></div>`;

test("finite input contracts preserve pixels, native attributes, focus, editing and scroll", {timeout:60000}, async () => {
  const css=await rendererCss();
  const baseline = new Map<string,{pixels:Buffer;state:unknown}>();
  for (const before of [true,false]) {
    const overrides=before ? Object.fromEntries(Object.entries(finiteInputsBefore).map(([path,text])=>[resolve(import.meta.dirname,"..",path),text])) : {};
    const f=await svelteBrowser(fixture(before),overrides);
    try {
      const {page}=f;
      await page.addStyleTag({content:css+'\ninput{caret-color:transparent}'});
      for (const width of [390,1024]) for (const theme of ['light','dark']) {
        await page.setViewportSize({width,height:700});
        await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
        async function compare(state: string) {
          await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
          const value={pixels:await page.locator('[data-fixture]').screenshot({animations:'disabled'}),state:await page.locator('[data-fixture]').evaluate(root=>({
            nodes:[...root.querySelectorAll('[data-place],.place-viewport,[data-slot="field"],input')].map(element=>({
              tag:element.tagName,attrs:[...element.attributes].filter(a=>a.name!=='class'&&a.name!=='style').map(a=>[a.name,a.value]).sort(),
              bounds:element.getBoundingClientRect().toJSON(),font:getComputedStyle(element).font,outline:getComputedStyle(element).outline,
            })), active:document.activeElement?.id,output:root.querySelector('output')?.textContent,
          }))};
          const key=`${width}/${theme}/${state}`;
          if(before) baseline.set(key,value); else {
            assert.deepEqual(value.state,baseline.get(key)!.state,key+' semantic DOM/geometry/focus');
            assert.equal(value.pixels.equals(baseline.get(key)!.pixels),true,key+' exact pixels');
          }
        }
        await compare('ready');
        await page.getByRole('searchbox',{name:'Find'}).fill('a query'); await compare('search-focus');
        await page.getByRole('textbox',{name:'Amount'}).fill('2345.60'); await compare('mask-focus');
        await page.getByRole('textbox',{name:'Amount'}).dispatchEvent('compositionstart');
        assert.match(await page.locator('output').innerText(),/true$/);
        await page.getByRole('textbox',{name:'Amount'}).dispatchEvent('compositionend');
        await page.getByRole('button',{name:'Readonly',exact:true}).click(); await compare('readonly');
        await page.getByRole('button',{name:'Disable',exact:true}).click(); await compare('disabled');
        await page.getByRole('button',{name:'Overlay',exact:true}).click();
        assert.equal(await page.locator('.place-viewport').evaluate(e=>(e as HTMLElement).inert),true); await compare('inert');
        await page.getByRole('button',{name:'Overlay',exact:true}).click();
        await page.locator('.place-viewport').evaluate(e=>e.scrollTop=300); await compare('scrolled');
        await page.locator('.place-viewport').evaluate(e=>e.scrollTop=0);
        await page.getByRole('button',{name:'Disable',exact:true}).click();
        await page.getByRole('button',{name:'Readonly',exact:true}).click();
        await page.getByRole('searchbox',{name:'Find'}).fill('first');
        await page.getByRole('textbox',{name:'Amount'}).fill('1234.50'); await page.getByRole('textbox',{name:'Amount'}).blur();
      }
      assert.deepEqual(f.errors,[]);
    } finally {await f.close();}
  }
});
