import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { inventoryVisualSources, type VisualInventory } from '../../src/authoring/visual-boundary/inventory.ts';

const root=resolve(import.meta.dirname,'../..'), directory=resolve(root,'artifacts/toolbar-canonical-geometry');
const pixelParity=[];
const geometry=[];
for(const width of [1280,390,320]){
  for(const name of ['page','search']){
    const left=name==='page'&&width===1280?480:0;
    const decode=async(stage:string)=>sharp(await readFile(resolve(directory,stage,`${width}-${name}.png`)))
      .extract({left,top:0,width:width-left,height:900}).ensureAlpha().raw().toBuffer();
    const [before,after]=await Promise.all([decode('before'),decode('after')]);
    assert.equal(before.length,after.length);
    let differentPixels=0;
    for(let i=0;i<before.length;i+=4)if(before.subarray(i,i+4).compare(after.subarray(i,i+4)))differentPixels++;
    pixelParity.push({width,name,region:{left,top:0,width:width-left,height:900},differentPixels,
      reason:left?'Page canvas excludes the sidebar whose geometry was explicitly approved to change.':'Complete captured viewport.'});
    assert.equal(differentPixels,0,`${width} ${name} approved pixels`);
  }
  const before=JSON.parse(await readFile(resolve(directory,'before',`${width}.json`),'utf8'));
  const after=JSON.parse(await readFile(resolve(directory,'after',`${width}.json`),'utf8'));
  geometry.push({width,before:before.samples,after:after.samples});
}
await writeFile(resolve(directory,'geometry-delta.json'),JSON.stringify({
  status:'bounded-geometry-evidence-not-release-qualification',
  canonical:{inset:8,gap:12,target:'max(44px, root body line-height + 12px)'},
  correction:'The approved CatalogWorkspace page had external 8px and internal 0px; 20px belonged to generic transient chrome, not the approved page.',
  pixelParity,geometry,
  readingEvidence:'reading/{390,1280}.json: 52px occluding rail + 32px fade; independent whole-header-bounds mutation fails at 60px, not a historical whole-viewport pixel claim.',
  typographyEvidence:'accessibility/*.png: same root comfortable density at 200% text gives equal 60px targets, LTR and RTL at 320 and 1280; compact environment has a different global line-height, not a consumer exception.',
},null,2)+'\n');

const paths=[
  'src/svelte/pieces/ToolbarLayout.svelte','src/svelte/pieces/toolbar-layout.css',
  'src/svelte/pieces/toolbar-bounds.ts','src/svelte/pieces/Toolbar.svelte',
  'src/svelte/explorer/CatalogWorkspace.svelte','src/svelte/explorer/CatalogToolbar.svelte',
  'src/svelte/explorer/CatalogNavigation.svelte','src/svelte/HumanProduct.svelte',
  'src/svelte/pieces/DateCalendar.svelte',
  'src/svelte/controls/DateControl.svelte','src/svelte/pieces/PickerSheet.svelte',
  'src/svelte/vendor/components/ui/calendar/calendar.svelte','src/svelte/pieces/media/Viewer.svelte',
  'src/svelte/pieces/media/ZoomControls.svelte','src/svelte/pieces/media/gestures.ts',
  'src/svelte/pieces/surface-chrome.css','src/svelte/reading.css','src/svelte/layout.css',
  'src/svelte/pieces/place-heading.css','src/svelte/pieces/media/media.css',
  'src/svelte/explorer/catalog-shell.css','src/svelte/explorer/catalog-search.css','src/svelte/explorer/catalog-profile.css',
  'src/svelte/pieces/scroll-edges.ts','src/svelte/pieces/toolbar-reading-boundary.ts',
  'src/svelte/pieces/place-focus.ts','src/svelte/pieces/editor-capacity.ts','src/svelte/theme.css',
];
const before=JSON.parse(await readFile(resolve(root,'docs/architecture/visual-ownership-debt.json'),'utf8')) as VisualInventory;
const after=await inventoryVisualSources(root);
await writeFile(resolve(directory,'ownership-delta-review.json'),JSON.stringify({
  status:'review-required-not-a-baseline-update',baselineDigest:before.sourceDigest,currentDigest:after.sourceDigest,
  sources:paths.map(path=>({path,before:before.sources.find(item=>item.path===path)??null,
    after:after.sources.find(item=>item.path===path)??null})),
},null,2)+'\n');
console.log(JSON.stringify({pixelParity,reports:['geometry-delta.json','ownership-delta-review.json']}));
