<script lang="ts">
  import type { CatalogProps } from '../../types.d.ts';
  import { Card, CollectionState, Grid, List, Row } from '../../index.ts';
  import { say } from '../../../infra/messages.ts';
  import { m } from '../../../../messages/keys.ts';
  import { mediaGridItems } from './media-grid-items.ts';
  let { node, select }: CatalogProps<'media-grid'> = $props();
  let presentation = $derived(node.presentation?.kind === 'media-grid' ? node.presentation : undefined);
  let items = $derived(presentation ? mediaGridItems(node.records, presentation) : []);
  const alt = (description: string | undefined, index: number) => description ?? say(m.mediaGrid.position, { position: String(index + 1) });
  const attention = (record: string) => Boolean(node.attention?.[record]?.length);
</script>

{#if items.length && presentation?.layout === 'list'}
  <List kind="rows" measure="reading">
    {#each items as item, index (item.id)}
      <Row label={alt(item.description, index)} trailing="none" interaction="open" available={!node.disabled} current={item.id === node.selectedId}
        attention={attention(item.id)} leading={item.artwork.kind === 'image'
          ? { kind: 'image', source: item.artwork.source, alt: alt(item.description, index), fit: item.fit }
          : { kind: 'artwork', media: item.artwork.media }} onopen={() => select(item.id)} />
    {/each}
  </List>
{:else if items.length}
  <Grid tracks="tiles" gap="regular">
    {#each items as item, index (item.id)}
      <Card presentation="tile" label={say(m.mediaGrid.open, { name: alt(item.description, index) })} alt={alt(item.description, index)}
        artwork={item.artwork.kind === 'image' ? item.artwork.source : item.artwork} fit={item.fit}
        attention={attention(item.id)} current={item.id === node.selectedId} disabled={node.disabled} onopen={() => select(item.id)} />
    {/each}
  </Grid>
{:else}<CollectionState loaded={node.loaded} createLabel={node.createLabel} connection={node.connection} />{/if}
