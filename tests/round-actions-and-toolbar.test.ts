import assert from "node:assert/strict";
import test from "node:test";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

const source = `<script lang="ts">
  import Toolbar from '@desert/svelte/catalog/compositions/toolbar/Toolbar.svelte';
  import Action from '@desert/svelte/catalog/foundations/action/Action.svelte';
  import { Button } from '@desert/svelte/vendor/components/ui/button/index.js';
  import * as InputGroup from '@desert/svelte/vendor/components/ui/input-group/index.js';
  const close = {label:'Close',icon:'close',state:'ready',intent:{kind:'close'}};
  const save = {label:'Save',icon:'save',state:'ready',intent:{kind:'journey',journey:'save'}};
</script>
<section data-surface-frame>
  <Toolbar toolbar={{edge:'top',title:'Edit trip',leading:close}} invoke={()=>{}} />
  <div class="flex gap-3"><Action label="Save" icon="save" emphasis="primary" state="ready" face="fit" type="button" />
    <Action label="Saving" icon="save" state="pending" emphasis="secondary" face="fit" type="button" />
    <Action label="Unavailable" icon="save" state="unavailable" emphasis="secondary" face="fit" type="button" /></div>
  <Button variant="row" size="row" data-test-row>List row</Button>
  <InputGroup.Root><InputGroup.Input aria-label="Search" />
    <InputGroup.Addon><InputGroup.Button aria-label="Clear">Clear</InputGroup.Button></InputGroup.Addon>
  </InputGroup.Root>
  <Toolbar toolbar={{edge:'bottom',secondary:close,primary:save}} invoke={()=>{}} />
</section>`;

test("standalone actions share capsule/circle geometry while toolbar edges have no divider", async () => {
  const f = await svelteBrowser(source);
  try {
    await f.page.addStyleTag({content:await rendererCss()});
    for (const profile of ["default", "apple-reference"]) for (const width of [900,390]) {
      await f.page.setViewportSize({width,height:740});
      await f.page.evaluate(profile => { document.documentElement.dataset.rendererProfile=profile; },profile);
      const buttons = f.page.locator('[data-action], [data-slot="input-group"] [data-slot="button"]');
      for (const button of await buttons.all()) {
        const shape = await button.evaluate(element => {
          const style = getComputedStyle(element), box = element.getBoundingClientRect();
          return {radius:parseFloat(style.borderTopLeftRadius),height:box.height,width:box.width};
        });
        assert.ok(shape.radius >= Math.min(shape.width,shape.height)/2, `${profile}/${width}: ${await button.getAttribute('aria-label')} is round`);
      }
      const close = f.page.locator('[data-toolbar="top"] [data-action]');
      const box = (await close.boundingBox())!;
      assert.equal(box.width,box.height,"icon action is a circle, not a rounded square");
      for (const bar of await f.page.locator('[data-toolbar]').all()) {
        assert.deepEqual(await bar.evaluate(element => {
          const style=getComputedStyle(element);
          return [style.borderTopWidth,style.borderBottomWidth];
        }), ['0px','0px'],"toolbar uses spacing, not a separator line");
      }
      assert.equal(await f.page.locator('[data-test-row]').evaluate(element => getComputedStyle(element).borderRadius),'0px',
        'row buttons remain part of their grouped container');
    }
    assert.deepEqual(f.errors,[]);
  } finally { await f.close(); }
});
