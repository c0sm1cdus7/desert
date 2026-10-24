import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir } from 'node:fs/promises';
import { svelteBrowser } from './fixtures/svelte-browser.ts';
import { rendererCss } from './fixtures/renderer-css.ts';
import { toolbarGeometrySource } from './fixtures/toolbar-geometry.ts';

for(const width of [320,1280]) for(const direction of ['ltr','rtl']) test(`canonical toolbars fit long titles and200% text at${width}px ${direction}`,async()=>{
  const source=toolbarGeometrySource.replace("title:'Task'","title:'A long title that remains readable without taking away the actions'");
  const f=await svelteBrowser(source,{},'http://toolbar.test/');
  try{
    await f.page.setViewportSize({width,height:900});
    await f.page.emulateMedia({reducedMotion:'reduce',colorScheme:'dark'});
    await f.page.route('**/sample.svg*',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}));
    await f.page.addStyleTag({content:await rendererCss()});
    await f.page.evaluate(direction=>{document.documentElement.dir=direction;document.documentElement.style.setProperty('--text-scale','2');},direction);
    await f.page.waitForFunction(()=>document.querySelector('[data-slot="sidebar-wrapper"]')?.getAttribute('data-type-density')==='comfortable');
    const expectedTarget=(await f.page.getByRole('button',{name:'Search',exact:true}).boundingBox())!.height;
    assert.equal(expectedTarget,60,'the measured workspace keeps enlarged reading targets');
    const standaloneTarget=(await f.page.locator('[data-standalone-toolbar] button').boundingBox())!.height;
    assert.equal(standaloneTarget,width===320?60:48,'a standalone surface uses the viewport type context');
    const measure=async(selector:string,target=expectedTarget)=>{
      await f.page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const bars=await f.page.locator(selector).evaluateAll(nodes=>nodes.map(node=>{
        const rect=node.getBoundingClientRect(),style=getComputedStyle(node),row=node.querySelector('.toolbar-row,[data-date-calendar-row]')!;
        return{left:rect.left,right:rect.right,client:node.clientWidth,scroll:node.scrollWidth,
          padding:style.paddingTop,gap:getComputedStyle(row).columnGap,
          buttons:[...row.querySelectorAll<HTMLElement>('button:not([data-media-thumbs] button)')].map(button=>button.getBoundingClientRect().toJSON())};
      }));
      for(const bar of bars){
        assert.equal(bar.padding,'8px');assert.equal(bar.gap,'12px');assert.ok(bar.scroll<=bar.client+1);
        for(const button of bar.buttons){assert.equal(button.height,target,'every surface uses its own page geometry reference');assert.ok(button.left>=bar.left&&button.right<=bar.right);}
        for(let i=0;i<bar.buttons.length;i++)for(let j=i+1;j<bar.buttons.length;j++){
          const a=bar.buttons[i]!,b=bar.buttons[j]!;
          assert.ok(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top,'action hitboxes never overlap');
        }
      }
    };
    await measure('[data-place-toolbar],[data-catalog-toolbar]');
    if(await f.page.getByRole('button',{name:'Show navigation',exact:true}).isVisible())await f.page.getByRole('button',{name:'Show navigation',exact:true}).click();
    await measure('[data-catalog-navigation] [data-piece="toolbar"]');
    await f.page.getByRole('button',{name:'Hide navigation',exact:true}).click();
    await mkdir('artifacts/toolbar-canonical-geometry/accessibility',{recursive:true});
    for(const[name,button,selector]of[
      ['calendar','Arrival · Oct 20, 2026','[data-date-calendar-header]'],
      ['task','Open task','[data-surface-frame] [data-piece="toolbar"]'],
      ['message','Open message','[data-frame-presentation="message"] [data-piece="toolbar"]'],
      ['viewer','Open viewer','[data-media-viewer] [data-piece="toolbar"]'],
    ]){
      await f.page.getByRole('button',{name:button!,exact:true}).click();await f.page.locator(selector!).first().waitFor();
      await measure(selector!,standaloneTarget);
      await f.page.screenshot({path:`artifacts/toolbar-canonical-geometry/accessibility/${width}-${direction}-${name}.png`});
      await f.page.keyboard.press('Escape');await f.page.locator(selector!).first().waitFor({state:'hidden'});
    }
    assert.deepEqual(f.errors,[]);
  }finally{await f.close();}
});
