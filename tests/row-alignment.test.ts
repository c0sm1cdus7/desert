import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import type { Locator, Page } from "playwright";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

const source = `<script lang="ts">
  import Collection from '@desert/svelte/catalog/compositions/collection/Collection.svelte';
  import DestinationRow from '@desert/svelte/catalog/foundations/destination-row/DestinationRow.svelte';
  import GroupedPanel from '@desert/svelte/catalog/foundations/grouped-panel/GroupedPanel.svelte';
  const titles = ['Uyuni Salt Flat', 'A destination with a deliberately long name that remains readable when its row wraps'];
  const common = {version:'desert.bank-node/1',kind:'collection',object:'place',loaded:true,disabled:false,selectedId:null,
    labels:{'place.title':'Title','place.description':'Description','place.region':'Region'},createLabel:'Create'};
  const records = titles.map((title, index) => ({id:String(index),version:1,facts:{title,
    description:index ? 'A long description that needs several readable lines on a compact display.' : 'High plateau',region:'South America'}}));
  let events = $state([]);
</script>
<main style="max-width:720px;padding:16px;display:grid;gap:24px">
  <section data-case="title-only"><Collection node={{...common,fields:['title'],records}} select={id => events.push(id)}/></section>
  <section data-case="metadata"><Collection node={{...common,fields:['title','description','region'],records}} select={id => events.push(id)}/></section>
  <section data-case="destination"><GroupedPanel><div data-grouped-rows>
    {#each titles as label, i}<DestinationRow destination={String(i)} {label} available={true} open={() => events.push(label)}/>{/each}
  </div></GroupedPanel></section>
  <output hidden>{JSON.stringify(events)}</output>
</main>`;
const rowSelector = '[data-grouped-action], [data-piece="destination-row"]';
const settle = (page: Page) => page.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {})));
});
const measure = (row: Locator) => row.evaluate(element => {
  const rect = (target: Element) => {
    const box = target.getBoundingClientRect();
    return { x:box.x, y:box.y, width:box.width, height:box.height, right:box.right, bottom:box.bottom, cy:box.y+box.height/2 };
  };
  const title = element.querySelector('strong, .destination-title')!;
  const heading = element.querySelector('[data-record-heading]') ?? title;
  const metadata = element.querySelector('[data-record-metadata]');
  const icon = element.querySelector('[data-control-chevron]')!;
  return { kind:element.closest('[data-case]')!.getAttribute('data-case'), title:title.textContent,
    row:rect(element), content:rect(element.querySelector('[data-button-content]')!), titleBox:rect(title), heading:rect(heading),
    icon:rect(icon), metadata:metadata?.textContent?.trim() ? rect(metadata) : null,
    titleLines:rect(title).height / parseFloat(getComputedStyle(title).lineHeight),
    scrollWidth:element.scrollWidth, clientWidth:element.clientWidth,
    background:getComputedStyle(element).backgroundImage,
    transform:getComputedStyle(element.querySelector('[data-button-content]')!).transform };
});
type Geometry = Awaited<ReturnType<typeof measure>>;
function alignment(item: Geometry, context: string): string[] {
  const failures: string[] = [], name = `${context}/${item.kind}/${item.title}`;
  const near = (actual: number, expected: number, reason: string) => {
    if (Math.abs(actual-expected) > .6) failures.push(`${name}: ${reason} (${actual.toFixed(2)} vs ${expected.toFixed(2)})`);
  };
  near(item.icon.cy, item.content.cy, 'chevron centers on the complete title and subtitle content');
  if (item.metadata) {
    near((item.heading.y+item.metadata.bottom)/2, item.row.cy, 'complete heading and metadata stack centers in the row');
    if (item.metadata.y < item.heading.bottom+1) failures.push(`${name}: metadata needs its own separated line`);
  } else {
    near(item.titleBox.cy, item.row.cy, 'title-only text centers in the full row');
    near(item.icon.cy, item.row.cy, 'title-only accessory centers in the full row');
  }
  if (item.row.height < 44) failures.push(`${name}: row retains a 44px minimum hit height`);
  if (item.titleBox.right > item.icon.x+.6) failures.push(`${name}: title does not overlap the trailing accessory`);
  if (item.heading.y < item.row.y-.6 || (item.metadata?.bottom ?? item.heading.bottom) > item.row.bottom+.6)
    failures.push(`${name}: complete text remains inside the row`);
  if (item.scrollWidth > item.clientWidth+1) failures.push(`${name}: row must not overflow horizontally`);
  return failures;
}
async function evidence(page: Page, name: string, observations: unknown) {
  const phase = process.env.DESERT_EVIDENCE_PHASE;
  if (!phase) return;
  assert.ok(['before','final'].includes(phase), 'evidence phase is explicit');
  const directory = `artifacts/row-alignment/${phase}`;
  await mkdir(directory, {recursive:true});
  const paths = ['src/svelte/catalog/compositions/collection/Collection.svelte','src/svelte/catalog/foundations/destination-row/DestinationRow.svelte','src/svelte/catalog/mechanisms/layout/layout.css',
    'src/svelte/theme.css','src/svelte/catalog/mechanisms/structured-content/structured-content.css','src/svelte/catalog/foundations/choice-row/ChoiceRow.svelte',
    'src/svelte/vendor/components/ui/button/button.svelte','src/svelte/vendor/components/ui/field/field.svelte','tests/row-alignment.test.ts'];
  const revision = Object.fromEntries(await Promise.all(paths.map(async path =>
    [path,createHash('sha256').update(await readFile(path)).digest('hex')])));
  await writeFile(`${directory}/${name}.json`, JSON.stringify({revision,observations},null,2));
  await page.locator('main').screenshot({path:`${directory}/${name}.png`,animations:'disabled'});
}

for (const colorScheme of ['light','dark'] as const) {
  test(`shared rows center titles and deliberately align multiline metadata (${colorScheme})`, {timeout:60000}, async () => {
    const f = await svelteBrowser(source), failures: string[] = [];
    try {
      await f.page.addStyleTag({content:await rendererCss()});
      await f.page.emulateMedia({colorScheme,reducedMotion:'reduce'});
      for (const width of [1280,900,390,320]) for (const scale of [1,2]) {
        await f.page.setViewportSize({width,height:1100});
        await f.page.evaluate(value => document.documentElement.style.setProperty('--text-scale',String(value)),scale);
        await settle(f.page);
        const observations = await Promise.all((await f.page.locator(rowSelector).all()).map(measure));
        await evidence(f.page,`${colorScheme}-${width}-${scale}x`,observations);
        assert.equal(observations.length,6);
        for (const item of observations) failures.push(...alignment(item,`${width}px/${scale}x`));
        if (width === 320) assert.ok(observations.find(item => item.kind === 'title-only' && item.title!.startsWith('A destination'))!.titleLines > 1,
          'compact long titles really exercise wrapping');
        // Containment is asserted per row; unrelated search-label overflow is recorded separately.
      }
      assert.deepEqual(f.errors,[]); assert.deepEqual(failures,[]);
    } finally { await f.close(); }
  });
}

test('hover and held feedback preserve row alignment and fixed hit geometry', {timeout:60000}, async () => {
  const f = await svelteBrowser(source), failures: string[] = [], observations: unknown[] = [];
  try {
    await f.page.addStyleTag({content:await rendererCss()});
    for (const width of [1280,900,320]) {
      await f.page.setViewportSize({width,height:1100});
      for (const row of await f.page.locator(rowSelector).all()) {
        await row.scrollIntoViewIfNeeded(); await f.page.mouse.move(0,0); await settle(f.page);
        const resting = await measure(row);
        await row.hover(); await settle(f.page); const hovered = await measure(row);
        await f.page.mouse.down();
        try {
          await settle(f.page); const held = await measure(row);
          observations.push({width,resting,hovered,held});
          failures.push(...alignment(resting,`${width}px/rest`),...alignment(hovered,`${width}px/hover`),...alignment(held,`${width}px/held`));
          assert.deepEqual(hovered.row,resting.row); assert.deepEqual(held.row,resting.row,'feedback never moves the hit surface');
          assert.equal(hovered.background,resting.background); assert.equal(held.background,hovered.background,'shared material does not change on press');
          assert.notEqual(held.transform,'none','normal-motion press retains shared content feedback');
        } finally { await f.page.mouse.move(0,0); await f.page.mouse.up(); await settle(f.page); }
      }
    }
    await evidence(f.page,'interaction',observations);
    assert.equal(await f.page.locator('output').textContent(),'[]','cancelled presses do not activate rows');
    assert.deepEqual(f.errors,[]); assert.deepEqual(failures,[]);
  } finally { await f.close(); }
});

const choiceSource = `<script lang="ts">
  import OptionsControl from '@desert/svelte/catalog/compositions/options-control/OptionsControl.svelte';
  const base = {version:'desert.control/1',kind:'options',disabled:false,minSelected:0,selected:[],options:[
    {value:'short',label:'A short option',disabled:false},
    {value:'details',label:'An option with details',description:'A description that wraps into several readable lines on narrow displays.',disabled:false}]};
</script>
<main style="max-width:720px;padding:16px;display:grid;gap:24px">
  <OptionsControl node={{...base,id:'radio',label:'One option',maxSelected:1}} onevent={() => {}}/>
  <OptionsControl node={{...base,id:'check',label:'Multiple options',maxSelected:2}} onevent={() => {}}/>
</main>`;

test('grouped radio and checkbox accessories center on their full text content', {timeout:60000}, async () => {
  const f = await svelteBrowser(choiceSource), failures: string[] = [], observations: unknown[] = [];
  try {
    await f.page.addStyleTag({content:await rendererCss()});
    for (const width of [1280,320]) for (const scale of [1,2]) {
      await f.page.setViewportSize({width,height:1100});
      await f.page.evaluate(value => document.documentElement.style.setProperty('--text-scale',String(value)),scale);
      for (const row of await f.page.locator('[data-choice-row]').all()) {
        await row.scrollIntoViewIfNeeded(); await f.page.mouse.move(0,0); await settle(f.page);
        const rest = await row.boundingBox();
        for (const state of ['rest','hover','held']) {
          if (state === 'hover') await row.hover();
          if (state === 'held') await f.page.mouse.down();
          await settle(f.page);
          const item = await row.evaluate(element => {
            const control = element.querySelector('[role=checkbox],[role=radio]')!, text = element.querySelector('[data-choice-copy]')!;
            const a = control.getBoundingClientRect(), b = text.getBoundingClientRect();
            return {role:control.getAttribute('role'),label:text.textContent,controlCenter:a.y+a.height/2,textCenter:b.y+b.height/2};
          });
          observations.push({width,scale,state,...item});
          if (Math.abs(item.controlCenter-item.textCenter) > .1)
            failures.push(`${width}px/${scale}x/${state}/${item.role}/${item.label}: accessory offset ${(item.controlCenter-item.textCenter).toFixed(3)}px`);
          assert.deepEqual(await row.boundingBox(),rest,'choice feedback keeps the hit surface stationary');
        }
        await f.page.mouse.move(0,0); await f.page.mouse.up(); await settle(f.page);
      }
    }
    await evidence(f.page,'choices',observations);
    assert.deepEqual(f.errors,[]); assert.deepEqual(failures,[]);
  } finally { await f.close(); }
});
