<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { presentFact, presentTitle, readingFields } from "../../../../interaction/fact-presentation.ts";
  import { GroupedPanel } from "../../index.ts";
  import { Button } from "../../../vendor/components/ui/button/index.js";
  import { Icon } from "../../index.ts";
  import { CollectionState } from "../../index.ts";
  import { retrieveCollection } from "../../../collection-retrieval.ts";
  import { MediaGrid } from "../../index.ts";
  import { MediaCollectionGrid } from "../../index.ts";
  import { AttentionIndicator } from '../../index.ts';
  let { node, select }: CatalogProps<"collection"> = $props();
  let { records, disabled, loaded, selectedId } = $derived(node);
  // Collections present records. Search belongs exclusively to the toolbar overlay.
  let visibleRecords = $derived(node.presentation ? records : retrieveCollection(records, node.fields, ""));
</script>
{#if node.presentation?.kind === "media-grid"}<MediaGrid {node} {select} />
{:else if node.presentation?.kind === "collection-grid"}<MediaCollectionGrid {node} {select} />
{:else if visibleRecords.length}<GroupedPanel>
<ul class="records" data-composition="collection" data-grouped-rows>
  {#each visibleRecords as record (record.id)}
    {@const secondary = readingFields(node.fields.slice(1), record.facts)}
    <li data-grouped-row>
      <Button variant="row" presentation="record-row" data-grouped-action onclick={() => select(record.id)} {disabled} aria-current={record.id === selectedId ? "true" : undefined}>
        <AttentionIndicator required={Boolean(node.attention?.[record.id]?.length)} />
        <span data-record-copy>
          <span data-record-heading><strong>{presentTitle(record.facts[node.fields[0]!])}</strong></span>
          {#if secondary.length}
            <span data-record-metadata>{#each secondary as field}<span data-record-value>{node.valueLabels?.[field]?.[String(record.facts[field])] ?? `${node.labels[`${node.object}.${field}`]} · ${presentFact(record.facts[field])}`}</span>{/each}</span>
          {/if}
        </span>
        <Icon name="chevron-right" placement="inline-end" chevron decorative />
      </Button>
    </li>
  {/each}
</ul>
</GroupedPanel>{/if}
{#if !records.length && !node.presentation}
  <CollectionState {loaded} createLabel={node.createLabel} connection={node.connection} />
{/if}
<style>
  strong { font-size:var(--text-control); line-height:var(--text-control--line-height); font-weight:var(--text-control--font-weight); overflow-wrap:anywhere; text-align:start; }
  [data-record-heading] { display:flex; align-items:center; justify-content:space-between; gap:1rem; }
  [data-record-copy] { display:flex; flex:1; min-width:0; flex-direction:column; gap:.25rem; }
  [data-record-value] { display:block; }
  [data-record-metadata] { display:flex; flex-wrap:wrap; gap:.375rem 1rem; text-align:start; color:var(--muted-foreground); font-size:var(--text-body); }
</style>
