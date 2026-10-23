<script lang="ts">
  import type { BankNodeFor } from '../../../interaction/bank-node.ts';
  import { Button } from '../../vendor/components/ui/button/index.js';
  import Image from './Image.svelte';
  import ArtworkPlaceholder from './ArtworkPlaceholder.svelte';
  import type { AssetReference } from '../../../assets/types.ts';
  import CollectionState from '../CollectionState.svelte';
  import GroupedPanel from '../GroupedPanel.svelte';
  import AttentionIndicator from '../AttentionIndicator.svelte';
  let { node, select }: { node: BankNodeFor<'collection'>; select: (id: string) => void } = $props();
  let presentation = $derived(node.presentation?.kind === 'media-grid' ? node.presentation : undefined);
</script>

{#snippet items()}
  <ul data-media-grid data-media-layout={presentation?.layout ?? 'grid'} data-composition="media-grid" data-grouped-rows={presentation?.layout === 'list' || undefined}>
    {#each node.records as record, index (record.id)}
      {@const source = record.facts[presentation!.image]}
      {@const description = presentation!.description ? record.facts[presentation!.description] : undefined}
      {@const alt = typeof description === 'string' && description.trim() ? description : `Media ${index + 1}`}
      {@const fit = presentation!.fit && record.facts[presentation!.fit] === 'fit' ? 'fit' : 'fill'}
      <li data-grouped-row={presentation?.layout === 'list' || undefined}>
        <Button variant={presentation?.layout === 'list' ? 'row' : 'well'} size="well" presentation={presentation?.layout === 'list' ? 'media-list-item' : 'media-tile'} disabled={node.disabled}
          aria-label={`Open ${alt}`} aria-current={record.id === node.selectedId ? 'true' : undefined}
          onclick={() => select(record.id)}>
          <AttentionIndicator required={Boolean(node.attention?.[record.id]?.length)} placement="overlay" />
          <span data-media-tile-artwork>
          {#if typeof source === 'string' && source.startsWith('/') && !source.startsWith('//')}
            <Image {source} {alt} {fit} />
          {:else if typeof source === 'object' && source !== null && 'kind' in source && source.kind === 'asset' && 'reference' in source && typeof source.reference === 'string'}
            {#if 'media' in source && (source.media === 'video' || source.media === 'audio')}
              <ArtworkPlaceholder kind={source.media} />
            {:else}<Image source={source as AssetReference} {alt} {fit} />{/if}
          {:else}<span data-media-artwork-placeholder>Image unavailable</span>{/if}
          </span>
          {#if presentation?.layout === 'list'}<span data-media-row-description>{alt}</span>{/if}
        </Button>
      </li>
    {/each}
  </ul>
{/snippet}
{#if node.records.length && presentation}
  {#if presentation.layout === 'list'}<GroupedPanel>{@render items()}</GroupedPanel>{:else}{@render items()}{/if}
{:else}<CollectionState loaded={node.loaded} createLabel={node.createLabel} connection={node.connection} />{/if}
