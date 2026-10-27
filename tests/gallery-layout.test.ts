import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Check} from '@sinclair/typebox/value';
import {DeclaredViewSchema as ViewSchema} from '../src/views/schema.ts';
import {Components,defineView} from '../src/views/components.ts';
import {svelteBrowser} from './fixtures/svelte-browser.ts';
import {rendererCss} from './fixtures/renderer-css.ts';
import { fixtureText } from "./fixtures/messages.ts";

test('gallery is an admitted finite View layout, not a caller-provided width or CSS escape',()=>{
  const view=defineView({name:'gallery-witness',layout:'gallery',content:[Components.Header({title:fixtureText.media})]});
  assert.equal(view.layout,'gallery');
  assert.equal(Check(ViewSchema,view),true);
  for(const layout of ['full-width','72rem',{width:'100%'},{style:'display:grid'}]){
    assert.equal(Check(ViewSchema,{...view,layout}),false);
    assert.throws(()=>defineView({name:'rejected-layout',layout,content:[]} as never));
  }
  assert.equal(Check(ViewSchema,{...view,width:'72rem'}),false);
});

for(const [width,scale] of [[1600,1],[390,1],[320,2]] as const){
  test(`the actual Flow gallery specimen keeps wide vertical stacks and responsive media at ${width}px / ${scale*100}%`,async()=>{
    const f=await svelteBrowser(`<script>import SharedOwnerSpecimen from './src/svelte/catalog/compositions/shared-owner-specimen/SharedOwnerSpecimen.svelte';</script><SharedOwnerSpecimen owner="Flow" />`,{},'http://gallery-fixture.test/');
    try{
      await f.page.setViewportSize({width,height:1000});
      await f.page.addStyleTag({content:await rendererCss()});
      const artwork=await readFile(new URL('../src/build/svelte/template/static/bank-image.svg',import.meta.url));
      await f.page.route('**/bank-image.svg',route=>route.fulfill({contentType:'image/svg+xml',body:artwork}));
      await f.page.evaluate(value=>document.documentElement.style.setProperty('--text-scale',String(value)),scale);
      await f.page.getByRole('button',{name:/^Layout ·/}).click();
      await f.page.getByRole('option',{name:'Gallery',exact:true}).click();
      const flow=f.page.locator('[data-view-content="gallery-fixture"]');
      await flow.waitFor();
      assert.equal(await flow.getAttribute('data-content-layout'),'gallery');
      assert.equal(await flow.locator('[data-card="collection"]').count(),2);
      assert.equal(await flow.locator('[data-card="tile"]').count(),3);
      const layout=await flow.evaluate(element=>{
        const a=element.querySelector('[data-view-item="collections"]')!.getBoundingClientRect();
        const b=element.querySelector('[data-view-item="media"]')!.getBoundingClientRect();
        return{width:element.getBoundingClientRect().width,max:getComputedStyle(element).maxWidth,rem:parseFloat(getComputedStyle(document.documentElement).fontSize),display:getComputedStyle(element).display,
          a:a.toJSON(),b:b.toJSON()};
      });
      assert.equal(layout.max,`${72*layout.rem}px`);
      assert.equal(layout.display,'flex');
      assert.ok(layout.b.top>=layout.a.bottom,'gallery stacks never become overview columns');
      assert.ok(Math.abs(layout.a.width-layout.b.width)<1);
      if(width===1600)assert.ok(layout.width>1000,'gallery is not constrained to the reading measure');
      assert.ok(layout.width<=width);
      assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      assert.deepEqual(f.errors,[]);
    }finally{await f.close();}
  });
}
