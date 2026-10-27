import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir } from 'node:fs/promises';
import { svelteBrowser } from './fixtures/svelte-browser.ts';
import { rendererCss } from './fixtures/renderer-css.ts';

const body='First paragraph.\n\n  Indented thought, with original spacing.\nA long identifier: '+ 'unchanged'.repeat(36);
const source=`<script lang="ts">
  import ContextPanel from '@desert/svelte/catalog/compositions/context-panel/ContextPanel.svelte';
  import ReadingContent from '@desert/svelte/catalog/compositions/reading-content/ReadingContent.svelte';
  let status=$state('open'); let commands=$state([]);
  const labels={'task.body':'details','task.projects':'projects'};
  const references={projects:[{value:'project-a',label:'iPhone research and a long project name',color:'violet'},
    {value:'project-b',label:'eBay',color:'green'}]};
  let selectors=$derived([{field:'status',label:'Status',value:status,disabled:false,options:[
    {value:'open',label:'Open',journey:'reopen',available:true},
    {value:'completed',label:'Completed',journey:'complete',available:true}]}]);
  function select(journey) {commands=[...commands,journey];status=journey==='complete'?'completed':'open';}
</script>
<main style="padding:16px">
  <section data-case="detail"><ContextPanel fields={['body','projects']} facts={{body:${JSON.stringify(body)},projects:['project-a','project-b']}}
    object="task" {labels} multiline={['body']} tags={['projects']} {references} actions={[]} {selectors} onselect={select}/></section>
  <section data-case="empty"><ContextPanel fields={['body','projects']} facts={{body:'  \\n ',projects:[]}}
    object="task" {labels} multiline={['body']} tags={['projects']} actions={[]}/></section>
  <section data-case="reading"><ReadingContent fields={['body']} facts={{body:'  '}} object="task" {labels}/></section>
  <section data-case="unknown"><ReadingContent fields={['body']} facts={{}} object="task" {labels}/></section>
  <output data-commands>{JSON.stringify(commands)}</output>
</main>`;

test('object detail reads prose before one property group, omits known empties, and retains unknowns', {timeout:60000}, async()=>{
  const f=await svelteBrowser(source,{},undefined,{initialCss:await rendererCss()});
  try {
    await f.page.waitForTimeout(50);assert.deepEqual(f.errors,[]);
    for(const width of [1600,390,320]) {
      await f.page.setViewportSize({width,height:1100});
      await f.page.evaluate(()=>document.documentElement.style.setProperty('font-size',innerWidth===320?'200%':'100%'));
      const detail=f.page.locator('[data-case="detail"]');
      assert.equal(await detail.locator('[data-fact-presentation="paragraph"]').textContent(),body,'reader preserves exact user content');
      const property=detail.locator('dl').filter({has:f.page.getByRole('button',{name:'Status',exact:true})});
      assert.equal(await property.count(),1,'state and factual properties share one semantic property group');
      assert.equal(await property.locator('.fact-label').first().textContent(),'Projects');
      assert.equal(await property.locator('.color-bullet[data-color]').count(),2,'project identity includes both readable name and color');
      assert.match(await property.textContent() ?? '',/iPhone research/,'reference labels retain original case');
      const geometry=await detail.evaluate(el=>{
        const prose=[...el.querySelectorAll('[data-fact-presentation="paragraph"]')].at(-1)!.getBoundingClientRect();
        const properties=el.querySelector('dl')!.getBoundingClientRect();
        const rows=[...el.querySelectorAll('dl > div')].map(row=>getComputedStyle(row));
        const label=el.querySelector('dl dt')!.getBoundingClientRect(),value=el.querySelector('dl dd')!.getBoundingClientRect();
        const reference=el.querySelector('.reference-value')!,bullet=reference.querySelector('.color-bullet')!.getBoundingClientRect();
        const text=[...reference.childNodes].find(node=>node.nodeType===Node.TEXT_NODE&&node.textContent?.trim())!;
        const range=document.createRange();range.selectNodeContents(text);const firstLine=range.getClientRects()[0]!;
        return {ordered:prose.bottom<=properties.top,width:properties.width,overflow:document.documentElement.scrollWidth>innerWidth,
          colorOnFirstLine:bullet.top>=firstLine.top-1&&bullet.bottom<=firstLine.bottom+1,
          reflowed:value.top>=label.bottom,
          dividers:rows.map(row=>Number.parseFloat(row.borderBottomWidth)),reading:getComputedStyle(el.querySelector('[data-fact-presentation="paragraph"]')!).whiteSpace};
      });
      assert.equal(geometry.ordered,true,'reading precedes metadata and commands');
      assert.equal(geometry.overflow,false,'long content and project names reflow at 320px and 200%');
      assert.ok(geometry.width<=Math.min(width-32,width===320?1088:544)+1);
      assert.deepEqual(geometry.dividers,[1,0],'one horizontal divider joins the two properties');
      assert.equal(geometry.reading,'pre-wrap');
      assert.equal(geometry.colorOnFirstLine,true,'a project color belongs to the first line of its name, not the middle of a wrapped paragraph');
      if(width===320)assert.equal(geometry.reflowed,true,'enlarged text uses full row width instead of breaking project names into tiny columns');
      assert.equal(await f.page.locator('[data-case="empty"] :is(dl,fieldset,legend,[data-fact-presentation])').count(),0,'empty object fields do not create empty panels or headings');
      assert.equal(await f.page.locator('[data-case="reading"] :is(fieldset,[data-fact-presentation])').count(),0,'reading owner itself omits known empty prose');
      assert.match(await f.page.locator('[data-case="unknown"]').textContent() ?? '',/Unknown/,'unknown is not silently treated as empty');
      if(process.env.DESERT_DETAIL_EVIDENCE){await mkdir('artifacts/object-detail-round3',{recursive:true});await f.page.screenshot({path:`artifacts/object-detail-round3/${width}.png`,fullPage:true});}
    }
    await f.page.setViewportSize({width:1000,height:900});
    await f.page.evaluate(()=>document.documentElement.style.setProperty('font-size','100%'));
    const trigger=f.page.getByRole('button',{name:'Status',exact:true});
    await trigger.click();
    assert.equal(await f.page.locator('[data-commands]').textContent(),'[]','opening the selector never changes the object');
    await f.page.getByRole('option',{name:'Open',exact:true}).click();
    assert.equal(await f.page.locator('[data-commands]').textContent(),'[]','reselecting the current state does not dispatch a mutation');
    await trigger.click();await f.page.getByRole('option',{name:'Completed',exact:true}).click();
    assert.equal(await f.page.locator('[data-commands]').textContent(),'["complete"]');
    await trigger.click();await f.page.getByRole('option',{name:'Open',exact:true}).click();
    assert.equal(await f.page.locator('[data-commands]').textContent(),'["complete","reopen"]','state changes remain reversible canonical commands');
    assert.deepEqual(f.errors,[]);
  }finally{await f.close();}
});

test('the existing multiline editor preserves long drafts, native selection and explicitly empty content', {timeout:60000}, async()=>{
  const f=await svelteBrowser(`<script lang="ts">
    import Field from '@desert/svelte/catalog/foundations/field/Field.svelte';
    let body=$state(${JSON.stringify(body)});
  </script><main style="padding:16px">
    <Field primitive="input.multiline" labelVisibility="visible" measure="writing" required={false} invalid={false} disabled={false} label="Details" value={body} identity="task:existing-version" onchange={value=>body=value}/>
    <output data-draft>{JSON.stringify(body)}</output>
  </main>`,{},undefined,{initialCss:await rendererCss()});
  try {
    const editor=f.page.getByRole('textbox',{name:'Details',exact:true});
    const edited='  Keep the leading spaces.\n\n'+Array.from({length:18},(_,i)=>`Paragraph ${i+1}: café, 東京 and original casing.`).join('\n')+'\n';
    for(const width of [1600,390,320]) {
      await f.page.setViewportSize({width,height:900});
      await editor.fill(edited);
      await editor.press('End');await editor.press('!');
      const value=await editor.inputValue();
      assert.equal(value,edited+'!');
      assert.equal(await f.page.locator('[data-draft]').textContent(),JSON.stringify(value));
      await editor.evaluate(element=>{const text=element as HTMLTextAreaElement;text.focus();text.setSelectionRange(2,18);});
      assert.deepEqual(await editor.evaluate(element=>{const text=element as HTMLTextAreaElement;return [text.selectionStart,text.selectionEnd];}),[2,18]);
      assert.equal(await editor.evaluate(element=>getComputedStyle(element).whiteSpace),'pre-wrap');
      assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    }
    await editor.fill('');await editor.blur();
    assert.equal(await f.page.locator('[data-draft]').textContent(),'""','empty content remains a valid exact draft value');
    assert.equal(await f.page.locator('[aria-required="true"]').count(),0,'an optional body does not invent a required marker');
    assert.deepEqual(f.errors,[]);
  }finally{await f.close();}
});
