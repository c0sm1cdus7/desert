<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { presentFact, presentTitle, readingFields } from "../../../../interaction/fact-presentation.ts";
  import { retrieveCollection } from "../../../collection-retrieval.ts";
  import { CollectionState, List, MediaCollectionGrid, MediaGrid, Row } from "../../index.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  let { node, select }: CatalogProps<"collection"> = $props();
  let { records, disabled, loaded, selectedId } = $derived(node);
  // Collections present records. Search belongs exclusively to the toolbar overlay.
  let visibleRecords = $derived(node.presentation ? records : retrieveCollection(records, node.fields, ""));
  /** The secondary lines of a record row: each further field's value label, or the field's label and its value. */
  function metadata(record: (typeof records)[number]): string[] {
    return readingFields(node.fields.slice(1), record.facts).map(field => node.valueLabels?.[field]?.[String(record.facts[field])]
      ?? say(m.collection.metadata, { label: node.labels[`${node.object}.${field}`]!, value: presentFact(record.facts[field]) }));
  }
</script>
{#if node.presentation?.kind === "media-grid"}<MediaGrid {node} {select} />
{:else if node.presentation?.kind === "collection-grid"}<MediaCollectionGrid {node} {select} />
{:else if visibleRecords.length}<List kind="rows" measure="reading">
  {#each visibleRecords as record (record.id)}
    <Row label={presentTitle(record.facts[node.fields[0]!])} metadata={metadata(record)}
      leading={{ kind: "attention", required: Boolean(node.attention?.[record.id]?.length) }} trailing="chevron" interaction="open"
      available={!disabled} current={record.id === selectedId} focusKey={record.id} onopen={() => select(record.id)} />
  {/each}
</List>{/if}
{#if !records.length && !node.presentation}
  <CollectionState {loaded} createLabel={node.createLabel} connection={node.connection} />
{/if}
