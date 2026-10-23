import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { assertClosedVisualBoundaries } from '../src/authoring/visual-boundary/closed.ts';
import { requiredAdapterSources } from '../src/authoring/visual-boundary/adapter.ts';

const paths=['views/MediaContent','views/InspectionContent','explorer/PublicCatalogBank']
  .map(path=>'src/svelte/'+path+'.svelte');
for(const path of paths)test(path+' only selects semantic catalog entries, never paint or raw composition',async()=>{
  for(const source of [
    '<div/>','Foreign text','<style>section{gap:2px}</style>','{@html text}',
    '<script>document.querySelector("main").style.padding="0"</script>',
    '<script>import Arbitrary from "./Arbitrary.svelte";</script><Arbitrary/>',
    '<script>import { MediaLibrary } from "@desert/svelte/adapter-catalog.ts";</script><MediaLibrary library={library} class="p-0"/>',
    '<script>import { InspectionCatalog } from "@desert/svelte/adapter-catalog.ts";</script><InspectionCatalog surface={surface} {...extra}/>',
    '<script>import { Inspection } from "@desert/svelte/adapter-catalog.ts";</script><Inspection><div/></Inspection>',
  ])assert.throws(()=>assertClosedVisualBoundaries([{path,source}]),/CLOSED_VISUAL_BOUNDARY/,source);
  assert.ok(requiredAdapterSources.includes(path),'Cannot drop this adapter from a real build');
  const source=await readFile(new URL('../'+path,import.meta.url),'utf8');
  assert.doesNotThrow(()=>assertClosedVisualBoundaries([{path,source}]));
});

for(const owner of ['pieces/media/Library','pieces/Inspection','catalog/InspectionCatalog','pieces/media/ZoomControls']){
  test(owner+' exposes semantic data/events, not native attributes or render slots',()=>{
    const path='src/svelte/'+owner+'.svelte';
    for(const source of [
      '<script lang="ts">import type { HTMLAttributes } from "svelte/elements";let attributes:HTMLAttributes<HTMLElement>=$props();</script><div {...attributes}/>',
      '<script>let {...extra}=$props()</script><section {...extra}/>',
      '<script>let {children}=$props()</script>{@render children()}',
    ])assert.throws(()=>assertClosedVisualBoundaries([{path,source}]),/CLOSED_VISUAL_BOUNDARY/);
    for(const markup of ['<Owner class="p-0"/>','<Owner style="padding:0"/>','<Owner {...extra}/>',
      '<Owner bind:this={arbitrary}/>', '<Owner><div/></Owner>']){
      assert.throws(()=>assertClosedVisualBoundaries([{path:'src/svelte/ExternalConsumer.svelte',source:
        `<script>import Owner from './${owner}.svelte';</script>${markup}`}]),/CLOSED_VISUAL_BOUNDARY/);
    }
  });
}
