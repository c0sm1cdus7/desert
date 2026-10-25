<script lang="ts">
  import type { CatalogProps } from '../../types.d.ts';
  import { presentTitle } from '../../../../interaction/fact-presentation.ts';
  import { Card, CollectionState, Grid } from '../../index.ts';
  import { say } from '../../../infra/messages.ts';
  import { m } from '../../../../messages/keys.ts';
  let { node, select }: CatalogProps<'media-collection-grid'> = $props();
  let presentation = $derived(node.presentation?.kind === 'collection-grid' ? node.presentation : undefined);
  const count = (value: number) => say(value === 1 ? m.mediaCollectionGrid.countOne : m.mediaCollectionGrid.countMany, { count: String(value) });
</script>

{#if node.records.length && presentation}
  <Grid tracks="collections" gap="regular">
    {#each node.records as record (record.id)}
      {@const title = presentTitle(record.facts[presentation.title])}
      {@const preview = presentation.previews.find(preview => preview.id === record.id)}
      <Card presentation="collection" label={say(m.mediaCollectionGrid.open, { title })} {title} subtitle={count(preview?.count ?? 0)}
        artwork={preview?.media} attention={Boolean(node.attention?.[record.id]?.length)} current={record.id === node.selectedId}
        disabled={node.disabled} onopen={() => select(record.id)} />
    {/each}
  </Grid>
{:else}<CollectionState loaded={node.loaded} connection={node.connection} />{/if}
