import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { svelteBrowser } from './fixtures/svelte-browser.ts';
import { rendererCss } from './fixtures/renderer-css.ts';
import { toolbarGeometrySource } from './fixtures/toolbar-geometry.ts';

for(const width of [390,1280])test(`overlay reading boundary protects the top rail and navigation return with a 32px fade at ${width}px`,async()=>{
  const overrides=process.env.TOOLBAR_LEGACY_BOUNDS?{[resolve('src/svelte/pieces/toolbar-bounds.ts')]:
    'export function toolbarBounds(toolbar){return toolbar.getBoundingClientRect();}'}:{};
  const f=await svelteBrowser(toolbarGeometrySource.replace('length:30','length:90'),overrides,'http://toolbar.test/');
  try{
    await f.page.setViewportSize({width,height:900});await f.page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});
    await f.page.addStyleTag({content:await rendererCss()});
    await f.page.locator('[data-catalog-scroll]').evaluate(node=>node.scrollTop=400);
    await f.page.waitForFunction(()=>document.querySelector('[data-catalog-content] [data-scroll-edge="top"]')?.getAttribute('data-active')==='true');
    await f.page.evaluate(async()=>{for(let i=0;i<4;i++)await new Promise(requestAnimationFrame);});
    const evidence=await f.page.locator('[data-catalog-content]').evaluate(owner=>({
      edges:[...owner.querySelectorAll<HTMLElement>('[data-scroll-edge]')].map(edge=>({
        direction:edge.dataset.scrollEdge,core:parseFloat(getComputedStyle(edge).getPropertyValue('--edge-core')),
        height:edge.getBoundingClientRect().height,gradient:getComputedStyle(edge,'::after').backgroundImage,
        filter:getComputedStyle(edge,'::after').backdropFilter})),
      mask:(owner.querySelector('[data-catalog-scroll]') as HTMLElement).style.maskImage,
    }));
    const directory='artifacts/toolbar-canonical-geometry/reading';await mkdir(directory,{recursive:true});
    await writeFile(`${directory}/${width}.json`,JSON.stringify(evidence,null,2)+'\n');
    await f.page.screenshot({path:`${directory}/${width}.png`});
    for(const edge of evidence.edges){
      const core=edge.direction==='bottom'&&width===390?60:52;
      assert.equal(edge.core,core,'compact navigation return protects its complete 44px target plus 8px insets');
      assert.equal(edge.height,core+32);assert.equal(edge.filter,'none');
    }
    assert.match(evidence.mask,/52px/);assert.match(evidence.mask,/84px/);
    assert.deepEqual(f.errors,[]);
  }finally{await f.close();}
});
