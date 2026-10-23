/** Production compositions and theme own every dimension; this fixture supplies content only. */
export const toolbarReadingGuideSource = (withAction: boolean) => `<script lang="ts">
  import CatalogWorkspace from '@desert/svelte/catalog/compositions/catalog-workspace/CatalogWorkspace.svelte';
  import {viewEventOwnership} from '@desert/web/client/view-events.ts';
  import type { ResolvedView } from '@desert/views/resolved.ts';
  import type { ToolbarAction } from '@desert/interaction/toolbar.ts';
  const identity = { title: 'Visual catalog', subtitle: 'Shared web components.' };
  const resolved: ResolvedView = {
    view: { version: 'desert.view/1', id: 'reading-guide', outputs: [], content: [
      { kind: 'header', id: 'heading', ...identity },
      ...Array.from({ length: 36 }, (_, index) => ({
        kind: 'stack' as const, id: 'section-' + index, title: index === 0 ? 'Foundations' : 'Example ' + index,
        items: [{ kind: 'text' as const, id: 'text-' + index, text: 'Shared material, reading, row, field, action and status rules.' }],
      })),
    ] }, bindings: {}, disabledOutputs: [],
  };
  const topActions: readonly ToolbarAction[] = ${withAction ? "[{label:'Create note',icon:'create',state:'ready',intent:{kind:'journey',journey:'create-note'}}]" : "[]"};
</script>
<CatalogWorkspace navigationSurface={{title:'VOID',settingsPlaceholder:true}} title={identity.title} {identity} {topActions} invoke={()=>{}}
  navigation={[{id:'catalog',label:'Visual catalog',icon:'catalog',group:'Developer',purpose:'utility'}]}
  active="catalog" query="" searching={false} onsearch={()=>{}} oncancel={()=>{}} onquery={()=>{}} onnavigate={()=>{}}
  content={{kind:'view-program',visited:[{...resolved,owner:viewEventOwnership().sync([],false).main}],activeView:resolved.view.id,
    albums:{},onevent:()=>{},onalbum:()=>{},onactions:()=>{}}} />`;
