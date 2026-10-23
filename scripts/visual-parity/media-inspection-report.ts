import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { mediaInspectionBefore } from '../../tests/fixtures/media-inspection-before.ts';
import { inspectVisualSource } from '../../src/authoring/visual-boundary/inspect.ts';
import { digest } from '../../src/authoring/visual-boundary/model.ts';
import { inventoryVisualSources, type VisualInventory } from '../../src/authoring/visual-boundary/inventory.ts';

const root=resolve(import.meta.dirname,'../..'), directory=resolve(root,'artifacts/media-inspection-ownership');
const baseline=JSON.parse(await readFile(resolve(root,'docs/architecture/visual-ownership-debt.json'),'utf8')) as VisualInventory;
const current=await inventoryVisualSources(root);
const mappings=[
  ['src/svelte/views/MediaContent.svelte','src/svelte/pieces/media/Library.svelte',
    'Closed library interaction: media descriptors and album intent, card selection, viewer queue, prefetch intent and opener/fallback focus. select is a semantic instance handle, not a DOM render escape.'],
  ['src/svelte/views/InspectionContent.svelte','src/svelte/pieces/Inspection.svelte',
    'Closed local inspection navigation retains diagnostic content and restores detail opener focus. No product operation or caller snippet is accepted.'],
  ['src/svelte/explorer/PublicCatalogBank.svelte','src/svelte/catalog/InspectionCatalog.svelte',
    'Closed specimen inventory owns section hierarchy and root-local entry lookup. The adapter cannot render wrappers. Independent legacy lookup mutation returns first rather than requested second instance and fails.'],
] as const;
const pairs=[];
for(const name of ['media-library','media-viewer','inspection-inventory','inspection-detail']){
  const [before,after]=await Promise.all(['before','after'].map(stage=>readFile(resolve(directory,`${name}-${stage}.png`))));
  assert.deepEqual(after,before,name+' exact captured viewport bytes');
  pairs.push({name,beforeDigest:digest(before),afterDigest:digest(after),equal:true});
}
const report={
  status:'bounded-closed-composition-migration-review-not-global-qualification',
  currentSourceDigest:current.sourceDigest,historicalAuditDigest:baseline.sourceDigest,
  independentOracle:'tests/fixtures/media-inspection-before.ts stores original pre-extraction source; comparisons do not use the new owners as their own reference.',
  oracleDigest:digest(await readFile(resolve(root,'tests/fixtures/media-inspection-before.ts'))),
  pixelPairs:pairs,
  mappings:mappings.map(([adapter,owner,responsibility])=>({adapter,owner,responsibility,
    historical:baseline.sources.find(item=>item.path===adapter)??null,
    preExtraction:inspectVisualSource(adapter,mediaInspectionBefore[adapter]),
    currentAdapter:current.sources.find(item=>item.path===adapter),
    currentOwner:current.sources.find(item=>item.path===owner),
  })),
  limitations:['Chromium fixture evidence, not native Safari or all environment/state combinations.',
    'Catalog implementation retains legitimate drawing; a closed adapter gate is not complete legacy owner qualification.',
    'This report does not edit the debt baseline or authorize unchanged violations.'],
};
await writeFile(resolve(directory,'ownership-migration-review.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({path:resolve(directory,'ownership-migration-review.json'),pairs,
  migrations:report.mappings.map(item=>({adapter:item.adapter,before:item.preExtraction.findings.map(f=>f.code),after:item.currentAdapter?.findings.map(f=>f.code),owner:item.owner}))}));
