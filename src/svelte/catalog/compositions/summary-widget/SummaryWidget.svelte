<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { collectionSummary } from '../../../../interaction/collection-summary.ts';
  import { Button } from '../../../vendor/components/ui/button/index.js';
  import { Skeleton } from '../../../vendor/components/ui/skeleton/index.js';
  let {node,activate,available=true}:CatalogProps<"summary-widget">=$props();
  const id=$props.id();
  let specification=$derived(node.presentation?.kind==='summary-widget'?node.presentation:undefined);
  let summary=$derived(specification?collectionSummary(node.records,specification):undefined);
  let pending=$derived(!node.loaded&&node.connection!=='offline');
  let offline=$derived(node.connection==='offline');
  let description=$derived([
    ...(pending?[`${id}-loading`]:!node.loaded?[`${id}-reconnect`]:[
      `${id}-total`,`${id}-legend`,...(specification?.truncated?[`${id}-truncated`]:[]),
    ]),
    ...(offline?[`${id}-offline`]:[]),
  ].join(' '));
</script>

{#if specification && summary}
  <Button variant="outline" presentation="summary-widget" disabled={!available||node.disabled} onclick={activate}
    aria-label={`Open ${specification.title}`} aria-describedby={description} aria-busy={pending}>
    <span class="widget-heading"><strong>{specification.title}</strong><span>{specification.description}</span></span>
    {#if pending}
      <span class="widget-loading" aria-hidden="true"><Skeleton line="primary" /><Skeleton line="secondary" /></span>
      <span id={`${id}-loading`} class="sr-only" role="status">Loading summary…</span>
    {:else if !node.loaded}
      <span id={`${id}-reconnect`} class="widget-context">Reconnect to load this summary.</span>
    {:else}
      <span id={`${id}-total`} class="widget-total"><strong>{summary.total}</strong><span>{specification.totalLabel}</span></span>
      <span class="widget-chart" aria-hidden="true">
        {#each summary.segments as segment,index}<span data-segment={index} style:flex-grow={segment.count}></span>{/each}
      </span>
      <span id={`${id}-legend`} class="widget-legend">
        {#each summary.segments as segment}<span><strong>{segment.count}</strong> {segment.label}</span>{/each}
      </span>
      {#if specification.truncated}<span id={`${id}-truncated`} class="widget-context">Showing the first {summary.total} items.</span>{/if}
    {/if}
    {#if offline}<span id={`${id}-offline`} class="widget-context">Offline · {node.loaded?'Last loaded summary':'Controller unavailable'}</span>{/if}
  </Button>
{/if}

<style>
  .widget-heading,.widget-loading { display:flex; flex-direction:column; gap:var(--title-subtitle-gap,4px); min-width:0; }
  .widget-heading,.widget-context,.widget-legend { overflow-wrap:anywhere; }
  .widget-heading>span,.widget-context,.widget-legend { color:var(--muted-foreground); font-weight:400; }
  .widget-total { display:flex; flex-wrap:wrap; align-items:baseline; gap:var(--space-2,.5rem); min-width:0; }
  .widget-total>strong { font-size:2rem; line-height:1; }
  .widget-total>span { font-weight:400; color:var(--muted-foreground); }
  .widget-chart { display:flex; gap:2px; overflow:hidden; height:.6rem; border-radius:var(--radius); background:var(--muted); }
  .widget-chart>span { min-width:0; flex-basis:0; background:var(--primary); }
  .widget-chart>span:nth-child(even) { background:var(--muted-foreground); }
  .widget-legend { display:flex; flex-wrap:wrap; gap:var(--space-4,1rem); min-width:0; }
  .widget-legend>span { min-width:0; max-width:100%; }
  .widget-legend strong { color:var(--foreground); }
</style>
