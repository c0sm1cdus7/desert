import test from 'node:test';
import assert from 'node:assert/strict';
import {svelteBrowser} from './fixtures/svelte-browser.ts';
import {rendererCss} from './fixtures/renderer-css.ts';

// The control's own root: the first piece its specimen row's stack item holds (lane B's controls draw no data-control mark).
test('standalone media content shares its specimen reading guide',async()=>{
 const f=await svelteBrowser(`<script>
 import ControlBench from '@desert/svelte/catalog/compositions/control-bench/ControlBench.svelte';
 </script><ControlBench entryIds={['control.tag','control.avatar','control.image']} />`);
 try {
  await f.page.addStyleTag({content:await rendererCss()});
  const offsets=await f.page.locator('[data-view-item^="specimen:"]:visible').evaluateAll(rows=>rows.map(row=>{
   const title=row.closest('[data-view-item^="entry:"]')!.querySelectorAll('.place-stack-title')[1]!,content=row.querySelector('[data-stack-item] > *')!;
   return {label:title.getBoundingClientRect().left+parseFloat(getComputedStyle(title).paddingLeft),content:content.getBoundingClientRect().left};
  }));
  assert.equal(offsets.length,3,'each component presents only its selected state');
  for(const value of offsets) assert.equal(value.content,value.label);
  const notice=await f.page.getByRole('group',{name:'Interaction',exact:true}).getByRole('status').evaluate(e=>e.getBoundingClientRect().left+parseFloat(getComputedStyle(e).paddingLeft));
  assert.equal(notice,offsets[0]!.label);
 } finally {await f.close();}
});

for(const reduced of [false,true]) test(`icon and text buttons have visible, cancellable neutral feedback; reduced=${reduced}`,async()=>{
 const f=await svelteBrowser(`<script>
 import {Button} from '@desert/svelte/vendor/components/ui/button/index.js';
 import Search from '@lucide/svelte/icons/search';
 let clicks=$state(0);
 </script><Button variant="secondary" size="icon" aria-label="Search" onclick={()=>clicks++}><Search /></Button>
 <Button variant="secondary" onclick={()=>clicks++}>Choose files</Button>
 <Button variant="secondary" disabled>Disabled</Button><output>{clicks}</output>`);
 try {
  await f.page.addStyleTag({content:await rendererCss()});
  await f.page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});
  const settle=()=>f.page.evaluate(async()=>{await Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{})));});
  for(const name of ['Search','Choose files']) {
   const clicks=Number(await f.page.locator('output').innerText());
   const button=f.page.getByRole('button',{name,exact:true});
   const read=()=>button.evaluate(e=>{const s=getComputedStyle(e),c=e.querySelector('[data-button-content]')!;return {paint:s.boxShadow,ink:s.color,fill:s.backgroundColor,box:e.getBoundingClientRect().toJSON(),transform:getComputedStyle(c).transform};});
   await f.page.mouse.move(900,700);await settle();const rest=await read();
   await button.hover();await settle();await f.page.mouse.down();await settle();const held=await read();
   assert.notEqual(held.paint,rest.paint,'press must visibly tint the face without recoloring the glyph');
   assert.equal(held.ink,rest.ink);assert.equal(held.fill,rest.fill);assert.deepEqual(held.box,rest.box,'hit target stays fixed');
   if(reduced) assert.equal(held.transform,'none');
   else assert.ok(Number(held.transform.match(/matrix\(([^,]+)/)?.[1])<=.96,'perceptible content compression');
   await f.page.mouse.move(900,700);await settle();assert.deepEqual(await read(),rest);
   await f.page.mouse.up();assert.equal(Number(await f.page.locator('output').innerText()),clicks);
   await button.focus();await f.page.keyboard.down('Space');await settle();assert.notEqual((await read()).paint,rest.paint);
   await f.page.keyboard.up('Space');await settle();assert.equal((await read()).paint,rest.paint);
   assert.equal(Number(await f.page.locator('output').innerText()),clicks+1);
  }
  assert.equal(await f.page.getByRole('button',{name:'Disabled'}).getAttribute('data-pressed'),null);
  assert.deepEqual(f.errors,[]);
 } finally {await f.close();}
});
