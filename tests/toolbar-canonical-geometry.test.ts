import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { svelteBrowser } from './fixtures/svelte-browser.ts';
import { rendererCss } from './fixtures/renderer-css.ts';
import { toolbarGeometrySource } from './fixtures/toolbar-geometry.ts';

for (const width of [1280, 390, 320]) test(`all toolbar consumers share approved page geometry at ${width}px`, async () => {
  const f=await svelteBrowser(toolbarGeometrySource,{},'http://toolbar.test/');
  const samples: unknown[]=[];
  const stage=process.env.TOOLBAR_EVIDENCE_STAGE ?? 'after';
  const directory=resolve(import.meta.dirname,'../artifacts/toolbar-canonical-geometry',stage);
  await mkdir(directory,{recursive:true});
  try {
    await f.page.setViewportSize({width,height:900});
    await f.page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});
    await f.page.route('**/sample.svg*',route=>route.fulfill({contentType:'image/svg+xml',body:
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#69757a"/></svg>'}));
    await f.page.addStyleTag({content:await rendererCss()});
    const sample=async (name:string,selector:string) => {
      await f.page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
      const metrics=await f.page.locator(selector).evaluateAll(elements=>elements.map(element=>{
        const style=getComputedStyle(element),row=element.querySelector<HTMLElement>('.toolbar-row')!;
        const box=element.getBoundingClientRect(),rail=row.getBoundingClientRect(),css=getComputedStyle(row);
        const pane=element.closest<HTMLElement>('.material-pane');
        const perimeter=pane?.getBoundingClientRect();
        return {messageHeading:element.closest('[data-frame-presentation="message"]') !== null && element.getAttribute('data-toolbar') === 'top',
          padding:[style.paddingTop,style.paddingRight,style.paddingBottom,style.paddingLeft],gap:css.columnGap,
          paneInset:pane&&perimeter?{left:rail.left-perimeter.left-pane.clientLeft,right:perimeter.right-rail.right-pane.clientLeft}:null,
          frame:{x:box.x,y:box.y,width:box.width,height:box.height},row:{x:rail.x,y:rail.y,width:rail.width,height:rail.height},
          buttons:[...row.querySelectorAll<HTMLElement>('button:not([data-media-thumbs] button)')].map(button=>{
            const b=button.getBoundingClientRect();return {label:button.getAttribute('aria-label'),x:b.x,y:b.y,width:b.width,height:b.height};
          })};
      }));
      samples.push({name,metrics});
      await f.page.screenshot({path:resolve(directory,`${width}-${name}.png`)});
      return metrics;
    };
    const all=[];
    const page=await sample('page','[data-place-toolbar],[data-catalog-toolbar]');
    if(width<960){await f.page.getByRole('button',{name:'Show navigation',exact:true}).click();}
    all.push(...await sample('navigation','[data-catalog-navigation] [data-piece="toolbar"]'));
    await f.page.getByRole('button',{name:'Hide navigation',exact:true}).click();
    await f.page.getByRole('button',{name:'Search',exact:true}).click();
    const search=await sample('search','[data-catalog-toolbar]');
    await f.page.getByRole('button',{name:'Close search',exact:true}).click();
    for(const [name,button,selector] of [
      ['calendar','Arrival · Oct 20, 2026','[data-date-calendar] [data-piece="toolbar"]'],
      ['task','Open task','[data-surface-frame] [data-piece="toolbar"]'],
      ['message','Open message','[data-frame-presentation="message"] [data-piece="toolbar"]'],
      ['viewer','Open viewer','[data-media-viewer] [data-piece="toolbar"]'],
    ]) {
      await f.page.getByRole('button',{name:button!,exact:true}).click();
      await f.page.locator(selector!).first().waitFor();
      all.push(...await sample(name!,selector!));
      await f.page.keyboard.press('Escape');
      await f.page.locator(selector!).first().waitFor({state:'hidden'});
    }
    await writeFile(resolve(directory,`${width}.json`),JSON.stringify({width,stage,page,samples},null,2)+'\n');
    // Commands and Search share the top edge at every width. The navigation
    // return remains at the lower leading corner; it is not the search rail.
    const x=width===1280?488:8, searchY=8;
    assert.deepEqual(page[0]!.row,{x,y:8,width:width-x-8,height:44});
    assert.deepEqual(page[1]!.row,{x,y:searchY,width:width-x-8,height:44});
    assert.deepEqual(search[0]!.row,{x:8,y:searchY,width:width-16,height:44});
    assert.deepEqual(search[0]!.buttons,[{label:'Close search',x:width-52,y:searchY,width:44,height:44}]);
    assert.ok(all.length>=5);
    for(const metric of all){
      // A message title has no commands below it: its content description owns
      // the same tight copy gap as page/toolbar headings. Action rails keep 8px.
      assert.deepEqual(metric.padding,['8px','8px',metric.messageHeading?'0px':'8px','8px'],'shared approved reading and action insets');
      assert.equal(metric.gap,'12px','shared approved page rail gap');
      if(metric.paneInset)assert.deepEqual(metric.paneInset,{left:8,right:8},'toolbar rail inset is measured from its pane, not just its local header');
      for(const button of metric.buttons) assert.equal(button.height,44,`shared target for ${button.label}`);
    }
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});
