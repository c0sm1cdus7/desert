import assert from 'node:assert/strict';
import test from 'node:test';
import { svelteBrowser } from './fixtures/svelte-browser.ts';
import { rendererCss } from './fixtures/renderer-css.ts';

// Independent walkthrough expectation: catalog selectors use Appearance's well.
// Embedded currency/state selectors may continue to reuse their parent's boundary.
const source = `<script>
  import Choice from '@desert/svelte/catalog/foundations/choice/Choice.svelte';
  import AppearancePreferences from '@desert/svelte/catalog/compositions/appearance-preferences/AppearancePreferences.svelte';
  import SpecimenGroup from '@desert/svelte/catalog/compositions/specimen-group/SpecimenGroup.svelte';
  let value=$state('empty'), edits=$state(0);
</script><main style="padding:16px;max-width:560px">
  <div data-default><Choice presentation="menu" cardinality="one" menuTrigger="well" label="State" labelVisibility="visible" selected={[value]}
    disabled={false} required={false} options={[{value:'empty',label:'Empty',disabled:false},{value:'value',label:'Value',disabled:false}]}
    onchange={next=>{value=next[0];edits++;}}/></div>
  <AppearancePreferences value={{theme:'dark',textSize:'standard',tint:'rose',wallpaper:'plain'}} onchange={()=>{}}/>
  <SpecimenGroup id="input.text"><p>Local example</p></SpecimenGroup>
  <div data-embedded><Choice presentation="menu" cardinality="one" menuTrigger="inline" label="Currency" labelVisibility="visible"
    selected={['USD']} disabled={false} required={false} options={[{value:'USD',label:'USD',disabled:false}]} onchange={()=>{}}/></div>
  <output>{value}/{edits}</output>
</main>`;

test('standalone catalog selectors use the Appearance well at wide and narrow widths', async () => {
  const f=await svelteBrowser(source,{},undefined,{initialCss:await rendererCss(),headed:true,channel:'chrome'});
  try {
    for (const width of [1000,390,320]) {
      await f.page.setViewportSize({width,height:1000});
      const trigger=f.page.locator('[data-default] [data-selection-trigger]');
      const reference=f.page.getByRole('button',{name:'Text size · Default',exact:true});
      const catalog=f.page.locator('[data-view-item="entry:input.text"] [data-selection-trigger]');
      for (const control of [trigger,reference,catalog]) {
        await control.waitFor();
        assert.equal(await control.locator('[data-field-well]').count(),1);
        assert.equal(await control.getAttribute('data-floating-field'),'true');
        assert.equal(await control.locator('.required').count(),0);
      }
      const geometry=async (control:typeof trigger)=>control.evaluate(element=>{
        const style=getComputedStyle(element);
        return {background:style.backgroundColor,radius:style.borderRadius,height:element.getBoundingClientRect().height};
      });
      assert.deepEqual(await geometry(trigger),await geometry(reference));
      assert.deepEqual(await geometry(catalog),await geometry(reference));
      assert.equal(await f.page.locator('[data-embedded] [data-field-well]').count(),0);
      assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    }
    const trigger=f.page.getByRole('button',{name:'State · Empty',exact:true});
    await trigger.click();
    await f.page.getByRole('option',{name:'Value',exact:true}).click();
    assert.equal(await f.page.locator('output').innerText(),'value/1');
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});
