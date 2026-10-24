import assert from 'node:assert/strict';
import test from 'node:test';
import { ResolvedNodes } from '../src/interaction/catalog.ts';
import { svelteBrowser } from './fixtures/svelte-browser.ts';
import { rendererCss } from './fixtures/renderer-css.ts';
import { catalogWorkspaceSource } from './fixtures/catalog-workspace.ts';
import { surfaceFrame, SurfaceFrameVersion } from '../src/interaction/surface-frame.ts';
import { compileViewProgram } from '../src/views/program.ts';
import { program, surface } from './fixtures/view-program.ts';

test('the canonical inventory has only foundations and compositions, including ordinary controls and media foundations', () => {
  assert.deepEqual(ResolvedNodes.groups.map(group=>group.title), ['Foundations','Compositions']);
  const expectedFoundations=['fact','action','availability','input.text','input.multiline','control.select',
    'control.files','control.labels','control.options','control.money','control.date','control.tag','control.image','control.avatar'];
  assert.deepEqual(ResolvedNodes.entries.filter(entry=>entry.inspection.group==='foundations').map(entry=>entry.id).sort(),expectedFoundations.sort());
  assert.equal(ResolvedNodes.entries.find(entry=>entry.id==='transient')!.inspection.group,'compositions');
});

test('surface areas reject non-toolbar vertical content and nested lateral surfaces',()=>{
  const frame={version:SurfaceFrameVersion,kind:'specimen',top:{title:'Child',subtitle:'A mounted surface.'},
    content:{kind:'message',text:'Content'},bottom:{}};
  assert.doesNotThrow(()=>surfaceFrame(frame));
  for(const edge of ['left','right','leftDock','rightDock']) assert.throws(()=>surfaceFrame({...frame,[edge]:{kind:'view',view:'catalog'}}),/INVALID_SURFACE_FRAME/);
  for(const edge of ['top','bottom']) assert.throws(()=>surfaceFrame({...frame,[edge]:{kind:'view',view:'catalog'}}),/INVALID_SURFACE_FRAME/);
  for(const edge of ['leftDock','rightDock']) {
    const candidate=structuredClone(program) as any;
    candidate.views.find((view:any)=>view.id==='workspace-navigation')[edge]={kind:'view',view:'catalog'};
    assert.throws(()=>compileViewProgram(candidate,surface),/INVALID_NAVIGATION_VIEW/);
  }
  for(const edge of ['topDock','bottomDock']) {
    const candidate=structuredClone(program) as any;
    candidate.views.find((view:any)=>view.id==='catalog')[edge]={kind:'view',view:'home'};
    assert.throws(()=>compileViewProgram(candidate,surface),/INVALID_VIEW_PROGRAM/);
  }
});

test('surface specimen mounts the actual frame and opens a transient, never a docked child',async()=>{
  const f=await svelteBrowser(catalogWorkspaceSource,{},undefined,{initialCss:await rendererCss()});
  try {
    await f.page.setViewportSize({width:1600,height:900});
    await f.page.emulateMedia({reducedMotion:'reduce'});
    await f.page.locator('[data-view-item="catalog-index"] [data-focus-key="Place"]').click();
    const specimen=f.page.locator('[data-view-item="owner:Place"]');
    assert.equal(await specimen.locator('[data-surface-frame]').count(),1);
    assert.equal(await specimen.locator('[data-toolbar="bottom"]').count(),0,'ordinary surface content has no detached footer action');
    assert.equal(await specimen.locator('[data-row]').getByText('Open transient',{exact:true}).count(),1,'launching a transient is an explicit action row');
    await specimen.getByRole('button',{name:'Open transient',exact:true}).click();
    const transient=f.page.locator('[data-composition="transient"]');
    await transient.waitFor();
    assert.equal(await transient.getAttribute('data-presentation'),'transient');
    assert.equal(await transient.locator('[data-surface-slot="content"]').count(),1);
    assert.equal(await transient.locator('[data-catalog-navigation]').count(),0);
    await transient.getByRole('button',{name:'Close',exact:true}).click();
    await transient.waitFor({state:'detached'});
    assert.ok(await specimen.getByRole('button',{name:'Open transient',exact:true}).evaluate(element=>element===document.activeElement));
    assert.deepEqual(f.errors,[]);
  }finally{await f.close();}
});

test('the visual index has exactly two categories and gives button, avatar, image and surface an explicit home', async()=>{
  const f=await svelteBrowser(catalogWorkspaceSource,{},undefined,{initialCss:await rendererCss()});
  try {
    const index=f.page.locator('[data-view-item="catalog-index"]');
    const titles=await index.locator('.place-stack > legend:visible').allTextContents();
    assert.deepEqual(titles.map(value=>value.trim()),['Foundations','Compositions']);
    const foundations=index.getByRole('group',{name:'Foundations',exact:true});
    for(const [id,title] of [['action','Button'],['control.avatar','Avatar'],['control.image','Image']]) {
      assert.equal(await foundations.locator(`[data-focus-key="${id}"]`).innerText(),title);
    }
    const compositions=index.getByRole('group',{name:'Compositions',exact:true});
    assert.equal(await compositions.locator('[data-focus-key="Place"]').innerText(),'Surface');
    assert.equal(await compositions.locator('[data-focus-key="transient"]').innerText(),'Transient surface');
    for(const entry of ResolvedNodes.entries) assert.equal(await index.locator(`[data-focus-key="${entry.id}"]`).count(),1,entry.id);
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});

test('component purpose is the actual content subtitle, never a detached Purpose section',async()=>{
  const f=await svelteBrowser(catalogWorkspaceSource,{},undefined,{initialCss:await rendererCss()});
  try {
    await f.page.emulateMedia({reducedMotion:'reduce'});
    for(const [id,title,words] of [['input.text','Text input',/single line/i],['action','Button',/command/i],
      ['ToolbarLayout','Toolbar',/navigation/i],['Place','Surface',/content/i]] as const) {
      await f.page.locator(`[data-view-item="catalog-index"] [data-focus-key="${id}"]`).click();
      const header=f.page.locator('[data-catalog-content] [data-place-header]').first();
      assert.equal(await header.locator('[data-place-title]').innerText(),title);
      assert.match(await header.locator('[data-place-subtitle]').innerText(),words);
      assert.equal(await f.page.getByRole('group',{name:'Purpose',exact:true}).count(),0);
      await f.page.locator('[data-catalog-content] > [data-toolbar="top"]').getByRole('button',{name:'Back',exact:true}).click();
    }
    assert.deepEqual(f.errors,[]);
  }finally{await f.close();}
});
