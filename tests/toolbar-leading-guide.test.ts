import assert from "node:assert/strict";
import test from "node:test";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

const source = `<script lang="ts">
  import Toolbar from '@desert/svelte/catalog/compositions/toolbar/Toolbar.svelte';
  let present=$state(true);
</script>
<section data-surface-frame>
  <Toolbar toolbar={{edge:'top',title:'Shared title',subtitle:'Shared subtitle',
    leading:present?{intent:{kind:'back'},label:'Back',icon:'back',state:'ready'}:undefined,
    trailing:[{intent:{kind:'journey',journey:'toggle'},label:'Toggle presence',icon:'edit',state:'ready'}]}}
    invoke={()=>present=!present} />
  <div class="surface-content"><p data-reading-guide>Reading guide</p></div>
</section>`;

test("one title guide follows finite leading controls and responsive wrapping", async () => {
  const f = await svelteBrowser(source, {}, undefined, { initialCss: await rendererCss() });
  try {
    await f.page.setViewportSize({width:1280,height:900});
    const metrics = () => f.page.evaluate(() => {
      const text = (selector:string) => { const range=document.createRange(); range.selectNodeContents(document.querySelector(selector)!); return range.getBoundingClientRect().left; };
      return {title:text('[data-toolbar-title]'),subtitle:text('[data-toolbar-subtitle]'),guide:text('[data-reading-guide]'),
        leading:document.querySelector('[data-toolbar-leading] button')?.getBoundingClientRect().right,
        layout:document.querySelector('[data-toolbar-layout]')?.getAttribute('data-toolbar-layout')};
    });
    const aligned = async () => {
      await f.page.waitForFunction(() => {
        const text=(selector:string)=>{const range=document.createRange();range.selectNodeContents(document.querySelector(selector)!);return range.getBoundingClientRect().left;};
        const row=document.querySelector('[data-toolbar-layout]')!;
        const leading=document.querySelector('[data-toolbar-leading] button')?.getBoundingClientRect().right;
        const guide=row.getAttribute('data-toolbar-layout')==='inline'&&leading!==undefined ? leading+12 : text('[data-reading-guide]');
        return Math.abs(text('[data-toolbar-title]')-guide)<.5;
      });
      const value=await metrics(); assert.ok(Math.abs(value.subtitle-value.title)<.5);
      assert.ok(await f.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'responsive title and controls remain contained');
    };
    await f.page.locator('[data-toolbar-has-leading]').waitFor();
    let value=await metrics(); assert.ok(Math.abs(value.title-value.leading!-12)<.5);
    await f.page.getByRole('button',{name:'Toggle presence'}).click(); await aligned();
    await f.page.getByRole('button',{name:'Toggle presence'}).click();
    await f.page.locator('[data-toolbar-has-leading]').waitFor();
    value=await metrics(); assert.ok(Math.abs(value.title-value.leading!-12)<.5);
    await f.page.setViewportSize({width:320,height:900});
    await f.page.evaluate(()=>document.documentElement.style.setProperty('--text-scale','2')); await aligned();
    await f.page.evaluate(()=>document.documentElement.style.removeProperty('--text-scale'));
    await f.page.setViewportSize({width:1280,height:900});
    await f.page.getByRole('button',{name:'Toggle presence'}).click(); await aligned();
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});
