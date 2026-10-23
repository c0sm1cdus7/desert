import assert from 'node:assert/strict';
import test from 'node:test';
import { assertCanonicalToolbarOwnership } from '../src/authoring/visual-boundary/toolbar.ts';

const check=(source:string,path='src/svelte/pieces/Consumer.svelte')=>assertCanonicalToolbarOwnership([{path,source}]);
for(const attribute of ['class="p-0"','style="padding:0"','style:padding="0"','{...attributes}','--toolbar-inset="0"'])
  test(`toolbar callers cannot pass ${attribute}`,()=>assert.throws(()=>check(
    `<script>import ToolbarLayout from './ToolbarLayout.svelte';</script><ToolbarLayout ${attribute}>Content</ToolbarLayout>`),/TOOLBAR_OWNERSHIP/));
for(const css of [
  ':global(.workspace-header){padding:0}',
  ':global([data-piece="toolbar"] .toolbar-row){gap:1px}',
  ':global([data-date-calendar] [data-toolbar-controls] button){width:36px}',
  ':global(.host){--toolbar-inset:0}',
  ':global(.host){--catalog-toolbar-height:20px}',
  ':global(.host){--catalog-toolbar-inset:0}',
]) test(`consumer cannot override toolbar geometry: ${css}`,()=>assert.throws(()=>check(`<style>${css}</style>`),/TOOLBAR_OWNERSHIP/));
test('standalone CSS cannot override toolbar descendants or inherited geometry',()=>{
  assert.throws(()=>check('[data-catalog-toolbar] .toolbar-row button{height:20px}','src/svelte/explorer/consumer.css'),/TOOLBAR_OWNERSHIP/);
});
test('equivalent CSS property spellings cannot bypass the toolbar geometry owner',()=>{
  for(const declaration of ['PADDING:99px','Padding-Inline-Start:99px','\\70 adding:99px',
    'padding/**/:99px','padding-inline-\\73 tart:99px']) {
    assert.throws(()=>check(`<style>:global([data-toolbar-title]){${declaration}}</style>`),/TOOLBAR_OWNERSHIP/,declaration);
    assert.throws(()=>check(`[data-toolbar-title]{${declaration}}`,'src/svelte/explorer/consumer.css'),/TOOLBAR_OWNERSHIP/,declaration);
  }
});
test('logical dimensions and identity displacement remain shared toolbar geometry',()=>{
  for(const declaration of ['inline-size:99px','block-size:99px','min-inline-size:99px','max-inline-size:99px',
    'min-block-size:99px','max-block-size:99px','inset-inline-start:99px','inset-block-end:99px',
    'position:relative','translate:99px','transform:translateX(99px)','scale:2','rotate:30deg',
    'order:99','display:none','text-align:end','white-space:pre','writing-mode:vertical-rl']) {
    assert.throws(()=>check(`<style>:global([data-toolbar-title]){${declaration}}</style>`),/TOOLBAR_OWNERSHIP/,declaration);
  }
});
test('toolbar owner cannot reopen arbitrary attributes or class/style inputs',()=>{
  for(const source of ['<script>let {class:className,...rest}=$props();</script><header {...rest}/>','<script>let {style}=$props();</script><header/>','<script lang="ts">import type {HTMLAttributes} from "svelte/elements";let props:HTMLAttributes<HTMLElement>=$props();</script><header/>'])
    assert.throws(()=>check(source,'src/svelte/catalog/compositions/toolbar-layout/ToolbarLayout.svelte'),/TOOLBAR_OWNERSHIP/);
});
test('inline ancestor variables and direct scripted metric mutations cannot bypass the owner',()=>{
  for(const source of ['<div style="--catalog-toolbar-height:20px"/>','<div style:--toolbar-inset="0"/>','<script>element.style.setProperty("--toolbar-target","20px")</script>','<button onclick={()=>element.style.setProperty("--toolbar-inset","0")}/>'])
    assert.throws(()=>check(source),/TOOLBAR_OWNERSHIP/);
});
test('renamed toolbar imports still reject visual attributes',()=>{
  assert.throws(()=>check('<script>import Rail from "./ToolbarLayout.svelte";</script><Rail style="padding:0"/>'),/TOOLBAR_OWNERSHIP/);
});
test('host overlay placement and ordinary content layout do not redefine toolbar internals',()=>{
  assert.doesNotThrow(()=>check('[data-owned-toolbar-host]{position:absolute;inset:0;z-index:2} .content{padding:20px}','src/svelte/explorer/host.css'));
  assert.doesNotThrow(()=>check(`<script>import ToolbarLayout from './ToolbarLayout.svelte';</script>
    <div data-owned-toolbar-host><ToolbarLayout edge="top" identity={{title:'Title'}} /></div>
    <style>[data-owned-toolbar-host]{position:absolute;inset:0;z-index:2} .content{inline-size:20rem;padding:20px}</style>`));
  assert.doesNotThrow(()=>check(`<script>import ToolbarLayout from './ToolbarLayout.svelte';</script><ToolbarLayout edge="top" identity={{title:'Title'}} />`));
});
test('the shared toolbar root is not a consumer-owned placement wrapper',()=>{
  assert.throws(()=>check('[data-place-toolbar]{inset:99px}','src/svelte/explorer/consumer.css'),/TOOLBAR_OWNERSHIP/);
  assert.throws(()=>check('<style>:global([data-place-toolbar]){position:absolute;inset:99px}</style>'),/TOOLBAR_OWNERSHIP/);
});
