import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import type {Locator} from 'playwright';
import {publicCatalogFixture} from './public-catalog-fixture.ts';
import {settle} from './public-catalog-expectations.ts';

for(const theme of ['light','dark'] as const) for(const width of [390,1280]) {
 test(`content guide and real floating/content press feedback ${theme}/${width}`,async()=>{
  const f=await publicCatalogFixture();
  const root=process.env.DESERT_EVIDENCE_DIR;
  try {
   await f.page.setViewportSize({width,height:740});await f.page.emulateMedia({colorScheme:theme});
   await f.page.goto(f.origin+'/?place=bank');await settle(f.page);
   if(root) await mkdir(root,{recursive:true});
   async function capture(name:string, locator?:Locator) {
    if(root) await (locator??f.page).screenshot({path:`${root}/${theme}-${width}-${name}.png`});
   }
   const offsets=await f.page.locator('[data-specimen]').evaluateAll(rows=>rows.flatMap(row=>{
    const item=row.querySelector('[data-stack-placement="content"]');if(!item)return [];
    const content=item.querySelector('[data-control], [data-catalog-card]');if(!content)return [];
    const p=row.querySelector('p')!;
    return [{kind:item.getAttribute('data-stack-kind'),guide:p.getBoundingClientRect().left+parseFloat(getComputedStyle(p).paddingLeft),edge:content.getBoundingClientRect().left}];
   }));
   assert.ok(offsets.length>=9);
   for(const o of offsets) assert.ok(Math.abs(o.guide-o.edge)<1,JSON.stringify(o));
   const rail=await f.page.locator('[data-stack-kind="catalog.home"] [data-catalog-group]').first().evaluate(e=>{
    const title=e.querySelector('[data-catalog-group-title]')!,card=e.querySelector('[data-catalog-card]')!;
    return title.getBoundingClientRect().left-card.getBoundingClientRect().left;
   });
   assert.equal(rail,16,'horizontal rail keeps its deliberate outer lane');
   const firstInput=await f.page.locator('[data-specimen]:has([data-primitive="input.text"])').first().evaluate(e=>{
    const p=e.querySelector('p')!,well=e.querySelector('.field-well')!;
    return p.getBoundingClientRect().left+parseFloat(getComputedStyle(p).paddingLeft)-well.getBoundingClientRect().left;
   });
   assert.equal(firstInput,16,'well perimeter is not moved inward');
   for(const kind of ['control.tag','control.avatar','catalog.card','catalog.home']) {
    const item=f.page.locator(`[data-stack-kind="${kind}"]`).first();
    await item.evaluate(e=>e.scrollIntoView({block:'center'}));await settle(f.page);await capture(kind.replace('.','-'));
   }
   await f.page.goto(f.origin+'/?place=travel-kit');await settle(f.page);
   for(const [name,id] of [['Search','search'],[width===390?'Show navigation':'Hide navigation','navigation'],['Choose files','files']] as const) {
    const button=f.page.getByRole('button',{name,exact:true});
    await button.evaluate(e=>e.scrollIntoView({block:'center'}));await settle(f.page);
    await f.page.mouse.move(0,739);await settle(f.page);
    const state=()=>button.evaluate(e=>{const s=getComputedStyle(e);return {ink:s.color,paint:s.boxShadow,box:e.getBoundingClientRect().toJSON(),transform:getComputedStyle(e.querySelector('[data-button-content]')!).transform};});
    const rest=await state();await capture(`${id}-rest`,button);
    await button.hover();await settle(f.page);const hover=await state();assert.equal(hover.ink,rest.ink);
    await f.page.mouse.down();await settle(f.page);const held=await state();await capture(`${id}-pressed`,button);
    assert.notEqual(held.paint,hover.paint);assert.equal(held.ink,rest.ink);assert.deepEqual(held.box,rest.box);
    assert.ok(Number(held.transform.match(/matrix\(([^,]+)/)?.[1])<=.96,`${name}: ${held.transform}`);
    await f.page.mouse.move(0,739);await f.page.mouse.up();await settle(f.page);assert.deepEqual(await state(),rest);
   }
  } finally {await f.close();}
 });
}
