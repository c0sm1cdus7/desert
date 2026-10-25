import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { svelteBrowser } from './fixtures/svelte-browser.ts';
import { rendererCss } from './fixtures/renderer-css.ts';
import { mediaInspectionBefore } from './fixtures/media-inspection-before.ts';
import { controlsBefore } from './fixtures/controls-before.ts';
import { pixelDifference } from './fixtures/pixel-difference.ts';

const root=resolve(import.meta.dirname,'..');
const previous=Object.fromEntries(Object.entries(mediaInspectionBefore).map(([path,source])=>[resolve(root,path),
  source.replaceAll('mediaImages', 'mediaItems').replaceAll('library.images', 'library.items')
    .replaceAll('target?.kind === "image"', 'target?.kind === "item"').replaceAll('target.image', 'target.item')
    .replaceAll('<Viewer {photos}', '<Viewer items={photos.map(photo => ({kind:"image",...photo}))}')
    .replaceAll('bind:index bind:open', '{index} {open} onindex={value=>index=value} onopen={value=>open=value}')
]));
// The frozen library returns focus through the card's record mark, which the catalog card drew before lane B recomposed
// it over Card (its folder is gone): the frozen side mounts that card at the composition's path (the same depth).
const frozenCard={[resolve(root,'src/svelte/catalog/compositions/catalog-card/CatalogCard.svelte')]:
  controlsBefore['src/svelte/catalog/foundations/catalog-card/CatalogCard.svelte']??''};
// The viewer's reset is an icon action now (DESIGN §7.7, lane E): the frozen side's zoom controls draw that one approved
// change, so every other element of the frozen viewer keeps its geometry and pixels.
const zoomControls=resolve(root,'src/svelte/catalog/compositions/zoom-controls/ZoomControls.svelte');
const frozenReset='<Button variant="secondary" aria-label="Reset zoom" onclick={onreset}><span data-media-zoom>{Math.round(scale*100)}%</span></Button>';
const frozenZoom={[zoomControls]:readFileSync(zoomControls,'utf8').replace(frozenReset,
  '<Button variant="secondary" size="icon-lg" aria-label="Reset zoom" onclick={onreset}><Icon name="undo-2" /></Button>')};
assert.notEqual(frozenZoom[zoomControls],readFileSync(zoomControls,'utf8'),'the frozen zoom controls still draw the text reset');
const directory=resolve(root,'artifacts/media-inspection-ownership');
const library={id:'travel',items:[
  {id:'coast',kind:'image',title:'Coast',image:{asset:'coast',alt:'A coast'}},
  {id:'peak',kind:'image',title:'Peak',image:{asset:'peak',alt:'A peak'}},
  {id:'forest',kind:'image',title:'Forest',image:{asset:'forest',alt:'A forest'}},
],albums:[{id:'trip',title:'Trip',cover:'coast',items:['coast','peak']},
  {id:'woods',title:'Woods',cover:'forest',items:['forest']}],featured:['trip','woods']};

async function prepare(source:string,overrides:Readonly<Record<string,string>>={}){
  const fixture=await svelteBrowser(source,overrides,'http://ownership.test/');
  await fixture.page.setViewportSize({width:900,height:700});
  await fixture.page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});
  await fixture.page.route('**/media/**',route=>route.fulfill({contentType:'image/svg+xml',body:
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#69867a"/></svg>'}));
  await fixture.page.addStyleTag({content:await rendererCss()});
  await fixture.page.getByRole('button',{name:'Mount fixture',exact:true}).click();
  return fixture;
}
async function settled(fixture:Awaited<ReturnType<typeof prepare>>){
  await fixture.page.evaluate(async()=>{
    await document.fonts.ready;
    await Promise.all([...document.images].filter(image=>image.checkVisibility()).map(image=>image.decode().catch(()=>{})));
    await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
  });
}
/** `selector` names the compared element; a pair names it per side (before, after) where a wrapper of the frozen side is gone.
 * `owned` compares an anatomy whose owner changed (the viewer composition became the media-viewer foundation, lane D):
 * its wrappers and class names are the new owner's, so the named and roled elements (every control, the dialog, the slider)
 * keep their geometry, names and type, and the viewport pixels stay identical. A heading is a heading by its element or its
 * role, and the dialog keeps its accessible name: the modal that holds the viewer now (F1d) names it with a visually
 * hidden title of its own, where the frozen viewer named it by its visible title, so that hidden name element is the
 * owner's and is not compared, while the name it gives is. */
/** `tolerance` lets a channel differ by that many levels: a card drawn by another owner (Card for the catalog card, lane B)
 * antialiases its rounded corners and its shade a level or two apart at the same place; a layout change cannot hide. */
async function compare(name:string,fixtures:Awaited<ReturnType<typeof prepare>>[],selector:string|readonly [string,string],owned=false,tolerance=0){
  await mkdir(directory,{recursive:true});
  const screenshots=[];
  const anatomy=[];
  for(const[index,fixture]of fixtures.entries()){
    await settled(fixture);
    const scope=fixture.page.locator(typeof selector==='string'?selector:selector[index?1:0]);
    anatomy.push(await scope.evaluate((element,owned)=>{
      const names=new Set<Element>();
      for(const dialog of [element,...element.querySelectorAll('[role="dialog"]')])
        for(const id of (dialog.getAttribute('aria-labelledby')??'').split(/\s+/).filter(Boolean)){const name=document.getElementById(id);if(name)names.add(name);}
      return [element,...element.querySelectorAll('*')].filter(child=>{
        if(!owned||!names.has(child))return true;
        const box=child.getBoundingClientRect();return box.width>1||box.height>1;
      }).map(child=>{
        const box=child.getBoundingClientRect(),style=getComputedStyle(child);
        const role=child.getAttribute('role')??(owned&&/^H[1-6]$/.test(child.tagName)?'heading':null);
        const labelledby=owned&&role==='dialog'?(child.getAttribute('aria-labelledby')??'').split(/\s+/).filter(Boolean)
          .map(id=>document.getElementById(id)?.textContent??'').join(' '):undefined;
        return {tag:child.tagName,text:child.children.length?'':child.textContent,
          class:owned?undefined:child.getAttribute('class'),role,label:child.getAttribute('aria-label'),
          ...(labelledby===undefined?{}:{name:labelledby}),
          width:box.width,height:box.height,padding:style.padding,gap:style.gap,font:style.font,
          display:style.display,visibility:style.visibility};
      }).filter(item=>!owned||item.role!==null||item.label!==null).map(item=>owned?{...item,display:undefined,tag:undefined}:item);
    },owned));
    const bytes=await fixture.page.screenshot({animations:'disabled'});
    await writeFile(resolve(directory,`${name}-${index?'after':'before'}.png`),bytes);
    screenshots.push(bytes);
  }
  assert.deepEqual(anatomy[1],anatomy[0],name+' identical DOM anatomy and geometry');
  if(tolerance===0)assert.ok(screenshots[1]!.equals(screenshots[0]!),name+' exact viewport pixels');
  else assert.deepEqual(await pixelDifference(fixtures[0]!.page,screenshots[0]!,screenshots[1]!,tolerance),{count:0,within:true},name+' viewport pixels within '+tolerance);
}

test('closed Media library preserves card/gallery pixels, queue, zoom controls and focus',async()=>{
  const source=`<script lang="ts">
    import Media from '@desert/svelte/catalog/renderer/media-content/MediaContent.svelte';
    let mounted=$state(false),album=$state<string|null>(null),media;
    const library=${JSON.stringify(library)};
  </script><button onclick={()=>mounted=true}>Mount fixture</button>
  <button onclick={()=>album=null}>All media</button>
  <button onclick={()=>media.select('image.forest')}>Search Forest</button>
  <main data-renderer-profile="apple-reference" data-catalog-scroll tabindex="-1" style="padding:16px">
  <div data-test-library>{#if mounted}<Media bind:this={media} {library} {album} onalbum={value=>album=value}/>{/if}</div></main>
  <output data-album>{album}</output>`;
  const fixtures=[await prepare(source,{...previous,...frozenCard,...frozenZoom}),await prepare(source)];
  try{
    // The library draws no wrapper of its own any more (lane D): the frozen side's wrapper is skipped, both compare the catalog.
    // Its cards are Card now (lane B), so their anatomy is the new owner's: named and roled elements and pixels are compared.
    await compare('media-library',fixtures,['[data-media-library] > :first-child','[data-test-library] > :first-child'],true,2);
    for(const f of fixtures){
      await f.page.getByRole('button',{name:'Trip',exact:true}).click();
      assert.equal(await f.page.locator('[data-album]').textContent(),'trip','the album card opens its album');
      await f.page.getByRole('button',{name:'Coast',exact:true}).click();
      await f.page.locator('[data-media-viewer]').waitFor();
      assert.equal(await f.page.locator('[data-media-viewer] [data-toolbar-subtitle]').textContent(),'1 / 2');
    }
    // The viewer is a media Modal now (F1d): the dialog that holds it is the modal's surface, and its mark is inside.
    // Its zoom commands are Bar's icon Actions now (lane E): their glyphs antialias a few levels (at most 14, measured)
    // apart from the frozen buttons' at the same place; a moved or resized glyph differs far more than that.
    await compare('media-viewer',fixtures,['[data-media-viewer]','[data-modal="media"]'],true,16);
    for(const f of fixtures){
      // The reset is an icon action now (DESIGN §7.7): the zoom is read from the image itself.
      const zoom=f.page.getByRole('button',{name:'Zoom in',exact:true});
      const scale=()=>f.page.locator('[data-media-stage] img').evaluate(item=>item instanceof HTMLElement ? item.style.transform : '');
      await zoom.click();
      assert.match(await scale(),/scale\(2\)/);
      assert.ok(await f.page.getByRole('button',{name:'Next media',exact:true}).isDisabled());
      await zoom.click();await zoom.click();
      assert.match(await scale(),/scale\(4\)/);
      assert.ok(await zoom.isDisabled());
      await f.page.getByRole('button',{name:'Reset zoom',exact:true}).click();
      assert.equal(await scale(),'');
      assert.ok(await f.page.getByRole('button',{name:'Zoom out',exact:true}).isDisabled(),'the fitted image cannot zoom out');
      await f.page.getByRole('button',{name:'Media 2: A peak',exact:true}).click();
      assert.equal(await f.page.locator('[data-media-viewer] [data-toolbar-subtitle]').textContent(),'2 / 2');
      await f.page.getByRole('button',{name:'Close media viewer',exact:true}).click();
      await f.page.locator('[data-media-viewer]').waitFor({state:'detached'});
      assert.ok(await f.page.getByRole('button',{name:'Coast',exact:true}).evaluate(button=>button===document.activeElement));
      await f.page.getByRole('button',{name:'Search Forest',exact:true}).click();
      await f.page.locator('[data-media-viewer]').waitFor();
      assert.equal(await f.page.locator('[data-media-viewer] [data-toolbar-subtitle]').textContent(),'3 / 3','Outside-album result uses library queue');
      await f.page.keyboard.press('Escape');
      await f.page.locator('[data-media-viewer]').waitFor({state:'detached'});
      assert.ok(await f.page.locator('main').evaluate(main=>main===document.activeElement));
      assert.deepEqual(f.errors,[]);
    }
  }finally{await Promise.all(fixtures.map(f=>f.close()));}
});

test('closed inspection preserves indexed inventory pixels, detail, drafts and retained focus',async()=>{
  const source=`<script>
    import Inspection from '@desert/svelte/catalog/renderer/inspection-content/InspectionContent.svelte';
    let mounted=$state(false);
  </script><button onclick={()=>mounted=true}>Mount fixture</button>
  <main data-renderer-profile="apple-reference" style="padding:16px">{#if mounted}<Inspection/>{/if}</main>`;
  // Keep the independently frozen host as the relocation oracle, while both
  // hosts consume the approved indexed bank rather than the removed all-at-once catalog.
  const previousHost=Object.fromEntries(Object.entries(previous).filter(([path])=>path.endsWith('/views/InspectionContent.svelte')));
  const fixtures=[await prepare(source,previousHost),await prepare(source)];
  try{
    await compare('inspection-inventory',fixtures,'[data-view-item="public-catalog-bank"]');
    const references=[];
    for(const f of fixtures){
      await f.page.locator('[data-view-item="catalog-index"] [data-focus-key="input.text"]').click();
      await f.page.locator('[data-view-item="entry:input.text"]').getByRole('button',{name:/^State ·/}).click();
      await f.page.getByRole('option',{name:'value',exact:true}).click();
      const field=f.page.locator('[data-view-item="specimen:input.text:value"] input');
      await field.fill('Retain this diagnostic thought');
      references.push(await field.elementHandle());
      await f.page.getByRole('button',{name:'Back',exact:true}).click();
      await f.page.locator('[data-view-item="catalog-index"] [data-focus-key="catalog.card"]').click();
      await f.page.locator('[data-view-item="entry:catalog.card"]').getByRole('button',{name:/^State ·/}).click();
      await f.page.getByRole('option',{name:'item',exact:true}).click();
      await f.page.locator('[data-view-item="specimen:catalog.card:item"] button').click();
      await f.page.locator('[data-view-item="about"]:visible').waitFor();
      assert.equal(await f.page.locator('[data-view-item="public-catalog-bank"]:visible').count(),0);
    }
    // The detail is its photograph region and its reading column (CatalogDetail draws no wrapper, lane D).
    await compare('inspection-detail',fixtures,'div:has(> [data-view-item="about"]):visible');
    for(const[index,f]of fixtures.entries()){
      await f.page.getByRole('button',{name:'Back to visual catalog',exact:true}).click();
      assert.ok(await f.page.locator('[data-view-item="specimen:catalog.card:item"] button').evaluate(button=>button===document.activeElement));
      await f.page.getByRole('button',{name:'Back',exact:true}).click();
      await f.page.locator('[data-view-item="catalog-index"] [data-focus-key="input.text"]').click();
      const field=f.page.locator('[data-view-item="specimen:input.text:value"] input');
      assert.equal(await field.inputValue(),'Retain this diagnostic thought');
      assert.ok(await field.evaluate((element,before)=>element===before,references[index]));
      assert.deepEqual(f.errors,[]);
    }
  }finally{await Promise.all(fixtures.map(f=>f.close()));}
});

test('inspection entry lookup stays within its own catalog instance',async()=>{
  const fixture=await prepare(`<script>
    import Bank from '@desert/svelte/catalog/renderer/public-catalog-bank/PublicCatalogBank.svelte';
    import {inspectionCatalog} from '@desert/svelte/catalog/compositions/inspection/inspection-fixture.ts';
    let mounted=$state(false),second,result=$state('');
  </script><button onclick={()=>mounted=true}>Mount fixture</button>
  <button onclick={async()=>{const revealed=await second.revealEntry('control.tag');
    result=revealed?document.activeElement?.closest('[data-test-bank]')?.getAttribute('data-test-bank')??'missing':'missing';}}>Reveal second Tag</button>
  <output>{result}</output>{#if mounted}
    <div data-test-bank="first"><Bank surface={inspectionCatalog} oncatalog={()=>{}}/></div>
    <div data-test-bank="second"><Bank bind:this={second} surface={inspectionCatalog} oncatalog={()=>{}}/></div>
  {/if}`,process.env.INSPECTION_LEGACY_LOOKUP?previous:{});
  try{
    await fixture.page.getByRole('button',{name:'Reveal second Tag',exact:true}).click();
    assert.equal(await fixture.page.locator('output').textContent(),'second');
    assert.deepEqual(fixture.errors,[]);
  }finally{await fixture.close();}
});
