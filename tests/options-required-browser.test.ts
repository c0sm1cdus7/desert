import test from 'node:test';
import assert from 'node:assert/strict';
import { svelteBrowser } from './fixtures/svelte-browser.ts';
import { rendererCss } from './fixtures/renderer-css.ts';

test('Stack and standalone options share explicit input requirements, never contextual cardinality',async()=>{
  const f=await svelteBrowser(`<script>
    import Stack from '@desert/svelte/catalog/compositions/stack/Stack.svelte';
    import NodeRenderer from '@desert/svelte/catalog/renderer/node-renderer/NodeRenderer.svelte';
    import { controlResolvedNode } from '@desert/interaction/resolved-node.ts';
    import { applyControlEvent } from '@desert/interaction/control-nodes.ts';
    const base={version:'desert.control/1',kind:'options',disabled:false,minSelected:1,maxSelected:1,
      options:[{value:'one',label:'One',disabled:false},{value:'two',label:'Two',disabled:false}]};
    let cases=$state([
      {...base,id:'context-empty',label:'Context empty',selected:[]},
      {...base,id:'context-selected',label:'Context selected',selected:['one']},
      {...base,id:'context-many',label:'Context many',maxSelected:2,selected:['one']},
      {...base,id:'input-empty',label:'Input empty',inputRequired:true,selected:[]},
      {...base,id:'input-selected',label:'Input selected',inputRequired:true,selected:['one']},
      {...base,id:'input-many',label:'Input many',inputRequired:true,maxSelected:2,selected:[]}
    ]);
    function change(event){if(event.kind==='options.change')cases=cases.map(node=>node.id===event.control?applyControlEvent(node,event).node:node);}
  </script>
  {#each cases as node}<section data-case={node.id}>
    <div data-presentation="stack"><Stack definition={{id:node.id,title:node.label,items:[controlResolvedNode(node)]}} onevent={change}/></div>
    <div data-presentation="standalone"><NodeRenderer node={controlResolvedNode(node)} onevent={change}/></div>
  </section>{/each}`);
  try {
    await f.page.addStyleTag({content:await rendererCss()});
    for(const id of ['context-empty','context-selected','context-many','input-selected']) {
      const example=f.page.locator(`[data-case="${id}"]`);
      assert.equal(await example.locator('.required-mark').count(),0,`${id} has no required marker anywhere`);
      assert.equal(await example.locator('[aria-required="true"]').count(),0,`${id} is not announced as required`);
    }
    for(const id of ['input-empty','input-many']) {
      const example=f.page.locator(`[data-case="${id}"]`);
      assert.equal(await example.locator('[data-presentation="stack"] .place-stack-title .required-mark').count(),1);
      assert.equal(await example.locator('[data-presentation="standalone"] [data-choice="rows"] > legend.required-mark').count(),1);
    }
    await f.page.locator('[data-case="input-empty"] [data-presentation="stack"]').getByRole('radio',{name:'One',exact:true}).click();
    assert.equal(await f.page.locator('[data-case="input-empty"] .required-mark').count(),0,
      'Once a single option is retained, both presentations remove the redundant marker');
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});

test('select labels and open listbox semantics distinguish contextual, retained and clearable input values',async()=>{
  const f=await svelteBrowser(`<script>
    import NodeRenderer from '@desert/svelte/catalog/renderer/node-renderer/NodeRenderer.svelte';
    import { controlResolvedNode } from '@desert/interaction/resolved-node.ts';
    import { applyControlEvent } from '@desert/interaction/control-nodes.ts';
    const base={version:'desert.control/1',kind:'select',disabled:false,required:true,
      options:[{value:'one',label:'One',disabled:false},{value:'two',label:'Two',disabled:false}]};
    let cases=$state([
      {...base,id:'context',label:'Context',value:'one'},
      {...base,id:'unavailable',label:'Unavailable',value:null,disabled:true},
      {...base,id:'retained',label:'Retained',inputRequired:true,value:'one'},
      {...base,id:'incomplete',label:'Incomplete',inputRequired:true,required:false,value:null},
      {...base,id:'clearable',label:'Clearable',inputRequired:true,required:false,value:'one'}
    ]);
    function change(event){if(event.kind==='select.change')cases=cases.map(node=>node.id===event.control?applyControlEvent(node,event).node:node);}
  </script>{#each cases as node}<section data-case={node.id}><NodeRenderer node={controlResolvedNode(node)} onevent={change}/></section>{/each}`);
  try {
    await f.page.addStyleTag({content:await rendererCss()});
    for(const id of ['context','unavailable','retained']) {
      const example=f.page.locator(`[data-case="${id}"]`);
      assert.equal(await example.locator('.required-mark').count(),0);
      assert.equal(await example.locator('[aria-describedby]').count(),0);
      assert.equal(await example.getByRole('button',{name:'Clear selection',exact:true}).count(),0);
    }
    for(const [id,label,required] of [['context','Context',false],['retained','Retained',false],['incomplete','Incomplete',true],['clearable','Clearable',true]] as const) {
      const example=f.page.locator(`[data-case="${id}"]`);
      assert.equal(await example.locator('.required-mark').count(),required?1:0);
      await example.getByRole('button',{name:new RegExp(`^${label} ·`)}).click();
      assert.equal(await f.page.getByRole('listbox',{name:label,exact:true}).getAttribute('aria-required'),required?'true':null);
      await f.page.keyboard.press('Escape');
    }
    await f.page.locator('[data-case="clearable"]').getByRole('button',{name:'Clear selection',exact:true}).click();
    assert.equal(await f.page.locator('[data-case="clearable"] .required-mark').count(),1);
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});
