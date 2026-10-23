<script lang="ts">
  import type { BankNodeFor } from '../../../interaction/bank-node.ts';
  import { Button } from '../../vendor/components/ui/button/index.js';
  import { presentTitle } from '../../../interaction/fact-presentation.ts';
  import Image from './Image.svelte';
  import CollectionState from '../CollectionState.svelte';
  import AttentionIndicator from '../AttentionIndicator.svelte';
  let { node, select }: { node: BankNodeFor<'collection'>; select: (id: string) => void } = $props();
  let presentation = $derived(node.presentation?.kind === 'collection-grid' ? node.presentation : undefined);
</script>

{#if node.records.length && presentation}
  <ul data-media-collection-grid data-composition="media-collection-grid">
    {#each node.records as record (record.id)}
      {@const title = presentTitle(record.facts[presentation.title])}
      {@const preview = presentation.previews.find(preview => preview.id === record.id)}
      <li>
        <Button variant="well" size="well" presentation="media-collection" disabled={node.disabled}
          aria-label={`Open collection ${title}`} aria-current={record.id === node.selectedId ? 'true' : undefined}
          onclick={() => select(record.id)}>
          <AttentionIndicator required={Boolean(node.attention?.[record.id]?.length)} placement="overlay" />
          <span data-media-collection-cover>
            {#if preview?.media}<Image source={preview.media} alt="" />
            {:else}<span data-media-collection-placeholder aria-hidden="true"></span>{/if}
          </span>
          <span data-media-collection-copy><strong>{title}</strong><span>{preview?.count ?? 0} {(preview?.count ?? 0) === 1 ? 'item' : 'items'}</span></span>
        </Button>
      </li>
    {/each}
  </ul>
{:else}<CollectionState loaded={node.loaded} connection={node.connection} />{/if}
