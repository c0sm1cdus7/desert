import assert from 'node:assert/strict';
import test from 'node:test';
import { svelteBrowser } from './fixtures/svelte-browser.ts';
import { rendererCss } from './fixtures/renderer-css.ts';
import { catalogWorkspaceSource } from './fixtures/catalog-workspace.ts';

test('catalog overview and widget show the actual Attention/Widgets composition and connection states', async t=>{
  const f=await svelteBrowser(catalogWorkspaceSource,{},undefined,{initialCss:await rendererCss()});
  try {
    await f.page.emulateMedia({reducedMotion:'reduce'});
    await f.page.setViewportSize({width:1600,height:1000});
    await f.page.locator('[data-catalog-index] [data-destination="Flow"]').click();
    const flow=f.page.locator('[data-owner-specimen="Flow"]');
    assert.equal(await flow.getByRole('group',{name:'Attention',exact:true}).count(),1);
    assert.equal(await flow.getByRole('group',{name:'Widgets',exact:true}).count(),1);
    assert.equal(await flow.getByRole('group',{name:'Open tasks',exact:true}).count(),0);
    assert.equal(await flow.getByRole('group',{name:'Notes',exact:true}).count(),0);
    await flow.getByRole('button',{name:'Open Tasks',exact:true}).click();
    assert.match(await flow.innerText(),/Open the Tasks destination locally/);
    await f.page.locator('[data-catalog-content] > [data-toolbar="top"]').getByRole('button',{name:'Back',exact:true}).click();
    await f.page.locator('[data-catalog-index] [data-destination="SummaryWidget"]').click();
    const specimen=f.page.locator('[data-owner-specimen="SummaryWidget"]');
    const widget=specimen.getByRole('button',{name:'Open Tasks',exact:true});
    assert.match(await widget.innerText(),/2 Open/);
    assert.match(await widget.innerText(),/1 Completed/);
    assert.equal(await widget.locator('[aria-hidden="true"]').count(),1,'the summary includes a graphic and readable counts');
    assert.ok((await widget.boundingBox())!.width<=400,'a widget is a bounded glance card, not a stretched object row');
    await widget.focus();
    await f.page.keyboard.press('Enter');
    assert.match(await specimen.innerText(),/Open the Tasks destination locally/);
    await specimen.getByRole('button',{name:/^State ·/}).click();
    await f.page.getByRole('option',{name:'Loading',exact:true}).click();
    assert.equal(await widget.getAttribute('aria-busy'),'true');
    assert.doesNotMatch(await widget.innerText(),/0 Tasks|Nothing here/);
    await specimen.getByRole('button',{name:/^State ·/}).click();
    await f.page.getByRole('option',{name:'Offline',exact:true}).click();
    assert.match(await widget.innerText(),/Last loaded summary/);
    assert.match(await widget.innerText(),/2 Open/);
    for(const [width,scale] of [[390,1],[320,2]]) {
      await f.page.setViewportSize({width:width!,height:1000});
      await f.page.evaluate(value=>document.documentElement.style.setProperty('--text-scale',String(value)),scale);
      const early=await f.page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));
      // Responsive surface ownership is published by ResizeObserver. Measure the
      // resulting layout, not the old dock reservation between resize and paint.
      await f.page.evaluate(async()=>{
        await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
        await Promise.all(document.getAnimations().filter(animation=>animation.effect?.getComputedTiming().iterations!==Infinity)
          .map(animation=>animation.finished.catch(()=>{})));
        await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
      });
      const pageGeometry=await f.page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth,
        overflowing:[...document.querySelectorAll<HTMLElement>('body *')].filter(element=>element.getBoundingClientRect().right>innerWidth+1)
          .slice(0,12).map(element=>({tag:element.tagName,slot:element.dataset.slot,right:element.getBoundingClientRect().right}))}));
      if(early.scroll>early.width)t.diagnostic(`ResizeObserver settlement: ${JSON.stringify({early,settled:pageGeometry})}`);
      assert.ok(pageGeometry.scroll<=pageGeometry.width,JSON.stringify({viewportWidth:width,scale,...pageGeometry}));
      const geometry=await widget.evaluate(element=>({scroll:element.scrollWidth,client:element.clientWidth,
        children:[...element.querySelectorAll<HTMLElement>('span')].filter(child=>child.scrollWidth>child.clientWidth+1)
          .map(child=>({text:child.textContent,scroll:child.scrollWidth,client:child.clientWidth,display:getComputedStyle(child).display}))}));
      assert.ok(geometry.scroll<=geometry.client+1,JSON.stringify({width,scale,...geometry}));
    }
    assert.deepEqual(f.errors,[]);
  }finally{await f.close();}
});
