import test from 'node:test';
import assert from 'node:assert/strict';
import { svelteBrowser } from './fixtures/svelte-browser.ts';
import { rendererCss } from './fixtures/renderer-css.ts';

const source=`<script>
import * as Sidebar from '@desert/svelte/vendor/components/ui/sidebar/index.js';
import { Button } from '@desert/svelte/vendor/components/ui/button/index.js';
import Search from '@lucide/svelte/icons/search';
</script>
<Button variant="outline" size="icon" aria-label="Search"><Search /></Button>
<Button variant="destructive">Delete</Button><Button>Continue</Button>
<Sidebar.Provider><Sidebar.Root collapsible="none">
<Sidebar.MenuButton isActive aria-current="page">Travel kit</Sidebar.MenuButton>
<Sidebar.MenuButton isActive aria-current="page">
{#snippet child({props})}<a {...props} href="#bank"><span>Component bank</span></a>{/snippet}
</Sidebar.MenuButton>
</Sidebar.Root></Sidebar.Provider>`;

for(const theme of ['light','dark']) {
  test(`sidebar selection uses a filled row, not a check; ${theme}`,async()=>{
    const f=await svelteBrowser(source);
    try {
      await f.page.addStyleTag({content:await rendererCss()});
      await f.page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
      await f.page.emulateMedia({reducedMotion:'reduce'});
      for(const row of await f.page.locator('[data-slot="sidebar-menu-button"]').all()) {
        const style=()=>row.evaluate(e=>{const s=getComputedStyle(e);return {fill:s.backgroundColor,ink:s.color};});
        assert.deepEqual(await style(),{fill:'rgb(0, 95, 207)',ink:'rgb(255, 255, 255)'});
        assert.equal(await row.locator('[data-navigation-selected]').count(),0);
        assert.equal(await row.getAttribute('aria-current'),'page');
        await row.hover();assert.deepEqual(await style(),{fill:'rgb(0, 95, 207)',ink:'rgb(255, 255, 255)'});
      }
      assert.deepEqual(f.errors,[]);
    } finally {await f.close();}
  });
  test(`button hover preserves neutral and semantic ink; ${theme}`,async()=>{
    const f=await svelteBrowser(source);
    try {
      await f.page.addStyleTag({content:await rendererCss()});
      await f.page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
      await f.page.emulateMedia({reducedMotion:'reduce'});
      for(const name of ['Search','Delete','Continue']) {
        const button=f.page.getByRole('button',{name,exact:true});
        await f.page.mouse.move(800,700);
        const ink=await button.evaluate(e=>getComputedStyle(e).color);
        await button.hover();
        assert.equal(await button.evaluate(e=>getComputedStyle(e).color),ink,name);
      }
      await f.page.keyboard.press('Tab');
      const focus=await f.page.locator(':focus-visible').evaluate(e=>getComputedStyle(e).outlineWidth);
      assert.equal(focus,'2px');
      assert.deepEqual(f.errors,[]);
    } finally {await f.close();}
  });
}
