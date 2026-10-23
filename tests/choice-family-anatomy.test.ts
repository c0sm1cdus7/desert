import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, mkdir } from 'node:fs/promises';
import type { Locator } from 'playwright';
import { svelteBrowser } from './fixtures/svelte-browser.ts';
import { rendererCss } from './fixtures/renderer-css.ts';
import { choiceFamilySource } from './fixtures/choice-family.ts';

// Independent accepted-v117 expectation: hosts cannot reinterpret row geometry.
const geometry = (rows: Locator) => rows.evaluateAll(elements => elements.map(element => {
  const content = element.querySelector('[data-choice-anatomy]')
    ?? element.querySelector('[data-grouped-content],[data-button-content]')!;
  const style = getComputedStyle(content), row = element.getBoundingClientRect();
  const copy = element.querySelector('[data-choice-copy]');
  const separator = getComputedStyle(element, '::before');
  return { height: row.height, padding: style.padding, gap: style.gap,
    titleType: copy ? getComputedStyle(copy.firstElementChild!).font : null,
    descriptionType: copy ? getComputedStyle(copy.lastElementChild!).font : null,
    copyGap: copy ? getComputedStyle(copy).gap : null,
    divider: { content: separator.content, left: separator.left, right: separator.right, height: separator.height },
    overflow: element.scrollWidth > element.clientWidth + 1 };
}));

test('inline and picker hosts consume one choice item and divided-list owner', async () => {
  for (const filename of ['catalog/foundations/choice-row/ChoiceRow.svelte','catalog/foundations/selection-field/SelectionList.svelte']) {
    const source = await readFile(new URL(`../src/svelte/${filename}`, import.meta.url), 'utf8');
    assert.match(source, /import ChoiceItem from/);
    assert.match(source, /<ChoiceItem/);
  }
  for (const filename of ['catalog/compositions/options-control/OptionsControl.svelte','catalog/foundations/selection-field/SelectionList.svelte']) {
    const source = await readFile(new URL(`../src/svelte/${filename}`, import.meta.url), 'utf8');
    assert.match(source, /import ChoiceList from/);
    assert.match(source, /<ChoiceList/);
  }
  const picker = await readFile(new URL('../src/svelte/catalog/foundations/selection-field/SelectionList.svelte', import.meta.url), 'utf8');
  assert.doesNotMatch(picker, /class="selection-option|rounded-xl|px-3|type-support/);
});

for (const width of [390,1280]) for (const colorScheme of ['light','dark'] as const)
test(`single divided-choice anatomy at ${width}px ${colorScheme}`, async () => {
  const f = await svelteBrowser(choiceFamilySource);
  try {
    await f.page.setViewportSize({width,height:900});
    await f.page.emulateMedia({colorScheme});
    await f.page.addStyleTag({content:await rendererCss()});
    const inline = f.page.locator('[data-case="single"] [data-choice-row]');
    const multiple = f.page.locator('[data-case="multiple"] [data-choice-row]');
    const reference = await geometry(inline);
    await f.page.getByRole('button',{name:'Picker route',exact:true}).click();
    const list = f.page.getByRole('listbox'); await list.waitFor();
    await f.page.evaluate(async () => { await Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a=>a.finished.catch(()=>{}))); });
    const picker = await geometry(list.getByRole('option'));
    assert.equal(reference.length,4); assert.equal(picker.length,4);
    assert.deepEqual(await geometry(multiple), reference);
    assert.deepEqual(picker, reference, 'picker and inline must share dimensions and divider insets');
    assert.deepEqual(reference[1]!.divider,{content:'""',left:'40px',right:'16px',height:'1px'});
    assert.equal(reference[0]!.padding,'12px 16px'); assert.equal(reference[0]!.gap,'12px');
    assert.equal(reference[0]!.copyGap,'4px');
    assert.ok(reference.every(row=>!row.overflow));
    assert.equal(await list.getAttribute('aria-required'),'true');
    assert.equal(await f.page.getByRole('radio',{name:'Closed route'}).isDisabled(),true);
    for (const row of [inline.last(),multiple.last(),list.getByRole('option').last()]) {
      assert.equal(await row.evaluate(element => getComputedStyle(element).opacity),'1','The row material never dims');
      assert.equal(await row.locator('[data-choice-anatomy]').evaluate(element => {
        let opacity=1;
        for (let current:Element|null=element; current; current=current.parentElement) {
          opacity*=Number(getComputedStyle(current).opacity);
          if (current.hasAttribute('data-choice-row')) break;
        }
        return opacity;
      }),.5,'The shared anatomy dims once, without a second button wrapper multiplier');
    }
    const folder=new URL('../artifacts/ui-maturity-implementation-v118/choices/',import.meta.url);
    await mkdir(folder,{recursive:true});
    await f.page.screenshot({path:new URL(`anatomy-${width}-${colorScheme}.png`,folder).pathname});
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});

test('choice descriptions reflow at 320px and 200% text without marking an always-selected command required', async () => {
  const f=await svelteBrowser(choiceFamilySource);
  try {
    await f.page.setViewportSize({width:320,height:900});
    await f.page.addStyleTag({content:await rendererCss()});
    await f.page.evaluate(()=>document.documentElement.style.fontSize='32px');
    const legend=f.page.locator('[data-case="single"] legend');
    assert.equal(await legend.innerText(),'Inline route');
    assert.equal(await legend.locator('.required').count(),0);
    assert.match(await f.page.locator('[data-case="multiple"] legend').innerText(),/Interests\*/,
      'A genuinely incomplete-capable multi-selection keeps its requirement');
    assert.ok(await legend.evaluate(el=>el.getBoundingClientRect().height>1));
    await f.page.getByRole('button',{name:'Picker route',exact:true}).click();
    const list=f.page.getByRole('listbox'); await list.waitFor();
    assert.ok(await list.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
    assert.ok((await geometry(list.getByRole('option'))).every(row=>!row.overflow));
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});
