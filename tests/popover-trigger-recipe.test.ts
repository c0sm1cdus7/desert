import test from "node:test";
import assert from "node:assert/strict";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

test("standard triggers preserve child-owned material while selection triggers own their finite recipe", async () => {
  const f = await svelteBrowser(`<script>
    import * as Popover from '@desert/svelte/vendor/components/ui/popover/index.js';
    import {Button} from '@desert/svelte/vendor/components/ui/button/index.js';
  </script>
  <Popover.Root><Popover.Trigger>{#snippet child({props})}<Button {...props} variant="secondary">Secondary action</Button>{/snippet}</Popover.Trigger></Popover.Root>
  <Popover.Root><Popover.Trigger presentation="selection">Reference selection</Popover.Trigger></Popover.Root>`);
  try {
    await f.page.addStyleTag({content:await rendererCss()});
    const standard=f.page.getByRole('button',{name:'Secondary action',exact:true});
    const selection=f.page.getByRole('button',{name:'Reference selection',exact:true});
    assert.equal(await standard.getAttribute('data-material'),'pane');
    assert.equal(await standard.getAttribute('data-variant'),'secondary');
    assert.equal(await standard.getAttribute('data-slot'),'button');
    assert.equal(await selection.getAttribute('data-material'),'pane');
    assert.equal(await selection.getAttribute('data-variant'),'well');
    assert.equal(await selection.getAttribute('data-slot'),'button');
    const material=await selection.evaluate(element=>{
      const style=getComputedStyle(element);
      return {border:style.borderTopWidth,kind:style.borderTopStyle,fill:style.backgroundColor,radius:style.borderTopLeftRadius};
    });
    assert.equal(material.kind,'solid'); assert.ok(parseFloat(material.border)>=1);
    assert.notEqual(material.fill,'rgba(0, 0, 0, 0)'); assert.ok(parseFloat(material.radius)>0);
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});
