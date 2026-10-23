import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { svelteBrowser } from './fixtures/svelte-browser.ts';
import { rendererCss } from './fixtures/renderer-css.ts';
import { mediaInspectionBefore } from './fixtures/media-inspection-before.ts';

const root=resolve(import.meta.dirname,'..');
const previous=Object.fromEntries(Object.entries(mediaInspectionBefore).map(([path,source])=>[resolve(root,path),
  source.replaceAll('mediaImages', 'mediaItems').replaceAll('library.images', 'library.items')
    .replaceAll('target?.kind === "image"', 'target?.kind === "item"').replaceAll('target.image', 'target.item')
    .replaceAll('<Viewer {photos}', '<Viewer items={photos.map(photo => ({kind:"image",...photo}))}')
    .replaceAll('bind:index bind:open', '{index} {open} onindex={value=>index=value} onopen={value=>open=value}')
]));
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
async function compare(name:string,fixtures:Awaited<ReturnType<typeof prepare>>[],selector:string){
  await mkdir(directory,{recursive:true});
  const screenshots=[];
  const anatomy=[];
  for(const[index,fixture]of fixtures.entries()){
    await settled(fixture);
    const scope=fixture.page.locator(selector);
    anatomy.push(await scope.evaluate(element=>[element,...element.querySelectorAll('*')].map(child=>{
      const box=child.getBoundingClientRect(),style=getComputedStyle(child);
      return {tag:child.tagName,text:child.children.length?'':child.textContent,
        class:child.getAttribute('class'),role:child.getAttribute('role'),label:child.getAttribute('aria-label'),
        width:box.width,height:box.height,padding:style.padding,gap:style.gap,font:style.font,
        display:style.display,visibility:style.visibility};
    })));
    const bytes=await fixture.page.screenshot({animations:'disabled'});
    await writeFile(resolve(directory,`${name}-${index?'after':'before'}.png`),bytes);
    screenshots.push(bytes);
  }
  assert.deepEqual(anatomy[1],anatomy[0],name+' identical DOM anatomy and geometry');
  assert.ok(screenshots[1]!.equals(screenshots[0]!),name+' exact viewport pixels');
}

test('closed Media library preserves card/gallery pixels, queue, zoom controls and focus',async()=>{
  const source=`<script lang="ts">
    import Media from '@desert/svelte/views/MediaContent.svelte';
    let mounted=$state(false),album=$state<string|null>(null),media;
    const library=${JSON.stringify(library)};
  </script><button onclick={()=>mounted=true}>Mount fixture</button>
  <button onclick={()=>album=null}>All media</button>
  <button onclick={()=>media.select('image.forest')}>Search Forest</button>
  <main data-renderer-profile="apple-reference" data-catalog-scroll tabindex="-1" style="padding:16px">
  {#if mounted}<Media bind:this={media} {library} {album} onalbum={value=>album=value}/>{/if}</main>`;
  const fixtures=[await prepare(source,previous),await prepare(source)];
  try{
    await compare('media-library',fixtures,'[data-media-library]');
    for(const f of fixtures){
      await f.page.locator('[data-record="album.trip"] button').click();
      assert.equal(await f.page.locator('[data-media-library]').getAttribute('data-media-album'),'trip');
      await f.page.locator('[data-record="image.coast"] button').click();
      await f.page.locator('[data-media-viewer]').waitFor();
      assert.equal(await f.page.locator('[data-media-viewer] [data-toolbar-subtitle]').textContent(),'1 / 2');
    }
    await compare('media-viewer',fixtures,'[data-media-viewer]');
    for(const f of fixtures){
      const zoom=f.page.getByRole('button',{name:'Zoom in',exact:true});
      await zoom.click();
      assert.equal(await f.page.locator('[data-media-zoom]').textContent(),'200%');
      assert.ok(await f.page.getByRole('button',{name:'Next media',exact:true}).isDisabled());
      await zoom.click();await zoom.click();
      assert.equal(await f.page.locator('[data-media-zoom]').textContent(),'400%');
      assert.ok(await zoom.isDisabled());
      await f.page.getByRole('button',{name:'Reset zoom',exact:true}).click();
      assert.equal(await f.page.locator('[data-media-zoom]').textContent(),'100%');
      await f.page.getByRole('button',{name:'Media 2: A peak',exact:true}).click();
      assert.equal(await f.page.locator('[data-media-viewer] [data-toolbar-subtitle]').textContent(),'2 / 2');
      await f.page.getByRole('button',{name:'Close media viewer',exact:true}).click();
      await f.page.locator('[data-media-viewer]').waitFor({state:'detached'});
      assert.ok(await f.page.locator('[data-record="image.coast"] button').evaluate(button=>button===document.activeElement));
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
    import Inspection from '@desert/svelte/views/InspectionContent.svelte';
    let mounted=$state(false);
  </script><button onclick={()=>mounted=true}>Mount fixture</button>
  <main data-renderer-profile="apple-reference" style="padding:16px">{#if mounted}<Inspection/>{/if}</main>`;
  // Keep the independently frozen host as the relocation oracle, while both
  // hosts consume the approved indexed bank rather than the removed all-at-once catalog.
  const previousHost=Object.fromEntries(Object.entries(previous).filter(([path])=>path.endsWith('/views/InspectionContent.svelte')));
  const fixtures=[await prepare(source,previousHost),await prepare(source)];
  try{
    await compare('inspection-inventory',fixtures,'[data-public-catalog-bank]');
    const references=[];
    for(const f of fixtures){
      await f.page.locator('[data-catalog-index] [data-destination="input.text"]').click();
      await f.page.locator('[data-catalog-entry="input.text"]').getByRole('button',{name:/^State ·/}).click();
      await f.page.getByRole('option',{name:'value',exact:true}).click();
      const field=f.page.locator('[data-specimen="input.text:value"] input');
      await field.fill('Retain this diagnostic thought');
      references.push(await field.elementHandle());
      await f.page.getByRole('button',{name:'Back',exact:true}).click();
      await f.page.locator('[data-catalog-index] [data-destination="catalog.card"]').click();
      await f.page.locator('[data-catalog-entry="catalog.card"]').getByRole('button',{name:/^State ·/}).click();
      await f.page.getByRole('option',{name:'item',exact:true}).click();
      await f.page.locator('[data-specimen="catalog.card:item"] button').click();
      await f.page.locator('[data-catalog-detail]:visible').waitFor();
      assert.equal(await f.page.locator('[data-public-catalog-bank]:visible').count(),0);
    }
    await compare('inspection-detail',fixtures,'[data-catalog-detail]:visible');
    for(const[index,f]of fixtures.entries()){
      await f.page.getByRole('button',{name:'Back to visual catalog',exact:true}).click();
      assert.ok(await f.page.locator('[data-specimen="catalog.card:item"] button').evaluate(button=>button===document.activeElement));
      await f.page.getByRole('button',{name:'Back',exact:true}).click();
      await f.page.locator('[data-catalog-index] [data-destination="input.text"]').click();
      const field=f.page.locator('[data-specimen="input.text:value"] input');
      assert.equal(await field.inputValue(),'Retain this diagnostic thought');
      assert.ok(await field.evaluate((element,before)=>element===before,references[index]));
      assert.deepEqual(f.errors,[]);
    }
  }finally{await Promise.all(fixtures.map(f=>f.close()));}
});

test('inspection entry lookup stays within its own catalog instance',async()=>{
  const fixture=await prepare(`<script>
    import Bank from '@desert/svelte/explorer/PublicCatalogBank.svelte';
    import {inspectionCatalog} from '@desert/svelte/catalog/inspection-fixture.ts';
    let mounted=$state(false),second,result=$state('');
  </script><button onclick={()=>mounted=true}>Mount fixture</button>
  <button onclick={async()=>{const target=await second.revealEntry('control.tag');result=target?.closest('[data-test-bank]')?.getAttribute('data-test-bank')??'missing';}}>Reveal second Tag</button>
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
