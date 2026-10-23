import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, writeFile } from 'node:fs/promises';
import { svelteBrowser } from './fixtures/svelte-browser.ts';
import { rendererCss } from './fixtures/renderer-css.ts';

const source = `<script lang="ts">
  import Collection from '@desert/svelte/catalog/compositions/collection/Collection.svelte';
  import ViewDestinationLink from '@desert/svelte/catalog/compositions/view-destination-link/ViewDestinationLink.svelte';
  import Information from '@desert/svelte/catalog/compositions/information/Information.svelte';
  import ContextPanel from '@desert/svelte/catalog/compositions/context-panel/ContextPanel.svelte';
  const common={version:'desert.bank-node/1',kind:'collection',object:'note',loaded:true,disabled:false,selectedId:null,
    labels:{'note.title':'Title','note.details':'Details'},createLabel:'Create'};
  const record=(id,title,details)=>({id,version:1,facts:{title,details}});
</script>
<main style="padding:16px;display:grid;gap:24px">
  <section data-case="one"><Collection node={{...common,fields:['title'],records:[record('1','iPhone ideas',''),record('2','Next steps','')]}} select={()=>{}} /></section>
  <section data-case="two"><Collection node={{...common,fields:['title','details'],records:[record('1','iPhone ideas','A useful second line')]}} select={()=>{}} /></section>
  <section data-case="empty-details"><Collection node={{...common,fields:['title','details'],records:[record('1','iPhone ideas','')]}} select={()=>{}} /></section>
  <section data-case="navigation"><ViewDestinationLink view="media" output="trash" label="Trash" icon="archive" available onevent={()=>{}} /></section>
  <section data-case="actions"><ContextPanel fields={[]} facts={{}} object="note" labels={{}} actions={[
    {id:'edit',label:'Edit',available:true,invoke:()=>{}},{id:'archive',label:'Archive',available:true,invoke:()=>{}}]} /></section>
  <section data-case="facts"><Information items={[{kind:'fact',label:'notes',value:'iPhone ideas'},
    {kind:'fact',label:'étiquette privée',value:'eBay'}, {kind:'fact',label:'API version',value:'vNext'}]} /></section>
  <section data-case="text"><Information items={[{kind:'text',text:'A readable paragraph must not stretch across the entire media gallery.'}]} /></section>
</main>`;

test('row families have real content height, action faces, horizontal separators and a shared reading measure', {timeout:60000}, async()=>{
  // Production loads the theme before mounting Svelte. Preserve cascade-layer order.
  const f=await svelteBrowser(source,{},undefined,{initialCss:await rendererCss()});
  try {
    await f.page.emulateMedia({reducedMotion:'reduce'});
    for(const width of [1600,390,320]) {
      await f.page.setViewportSize({width,height:1200});
      await f.page.evaluate(async()=>{await document.fonts.ready;});
      const actionRows=f.page.locator('[data-piece="destination-row"]');
      assert.equal(await actionRows.count(),3);
      for(const row of await actionRows.all()) assert.equal(await row.locator('[data-piece="face"][data-face-kind="icon"] svg').count(),1,'every action/navigation row has a face icon');
      assert.equal(await f.page.locator('[data-case="one"] [data-piece="face"]').count(),0,'object rows do not masquerade as action rows');
      assert.equal(await f.page.locator('[data-case="empty-details"] [data-record-metadata]').count(),0,'missing secondary content creates no empty line');
      const geometry=await f.page.evaluate(()=>{
        const box=(selector:string)=>document.querySelector(selector)!.getBoundingClientRect();
        const one=box('[data-case="one"] [data-grouped-action]');
        const two=box('[data-case="two"] [data-grouped-action]');
        const empty=box('[data-case="empty-details"] [data-grouped-action]');
        const panels=[...document.querySelectorAll('[data-grouped-panel],.bank-stack,[data-case="text"] > div')].map(el=>el.getBoundingClientRect().width);
        const rows=[...document.querySelectorAll('[data-case="one"] [data-grouped-row], [data-case="actions"] [data-grouped-row],.fact-row')].map(el=>{
          const css=getComputedStyle(el);return {left:parseFloat(css.borderLeftWidth),right:parseFloat(css.borderRightWidth)};
        });
        const second=[...document.querySelectorAll('[data-case="one"] [data-grouped-row] + [data-grouped-row], [data-case="actions"] [data-grouped-row] + [data-grouped-row]')]
          .map(el=>parseFloat(getComputedStyle(el).borderTopWidth));
        const facts=[...document.querySelectorAll('.fact-row')].map(el=>{const css=getComputedStyle(el);return {
          padding:parseFloat(css.paddingLeft),height:el.getBoundingClientRect().height,separator:parseFloat(css.borderBottomWidth)};});
        return {one:one.height,two:two.height,empty:empty.height,panels,rows,second,facts,overflow:document.documentElement.scrollWidth>innerWidth};
      });
      assert.ok(geometry.one>=44 && geometry.one<geometry.two,'one line uses a compact hit row; two lines grow naturally');
      assert.equal(geometry.empty,geometry.one,'empty optional details reserve no height');
      assert.ok(geometry.panels.every(size=>size<=544.5),'action, fact, object and text families share the 34rem measure');
      assert.ok(geometry.rows.every(row=>row.left===0&&row.right===0),'interior dividers never become vertical borders');
      assert.deepEqual(geometry.second,[1,1],'both grouped row families retain horizontal shared separators');
      assert.ok(geometry.facts.every(row=>row.padding===16&&row.height>=44),'fact interiors retain the shared inset and readable row height');
      assert.deepEqual(geometry.facts.map(row=>row.separator),[1,1,0],'related facts have horizontal separators inside one pane');
      assert.equal(geometry.overflow,false);
      if(process.env.DESERT_ROW_EVIDENCE) {
        const directory='artifacts/row-family-round2';
        await mkdir(directory,{recursive:true});
        await f.page.screenshot({path:`${directory}/${width}.png`,fullPage:true,animations:'disabled'});
        await writeFile(`${directory}/${width}.json`,JSON.stringify(geometry,null,2));
      }
    }
    assert.deepEqual(await f.page.locator('.fact-label').allTextContents(),['Notes','Étiquette privée','API version']);
    assert.deepEqual(await f.page.locator('.fact-value').allTextContents(),['iPhone ideas','eBay','vNext']);
    assert.equal(await f.page.locator('[data-case="one"] strong').first().textContent(),'iPhone ideas','user-authored object titles retain casing');
    assert.deepEqual(f.errors,[]);
  }finally{await f.close();}
});
