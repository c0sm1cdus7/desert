<script lang="ts">
  import type { BankNodeFor } from "../interaction/bank-node.ts";
  import { presentFact, presentTitle } from "../interaction/fact-presentation.ts";
  import GroupedPanel from "./pieces/GroupedPanel.svelte";
  import * as Field from "./vendor/components/ui/field/index.js";
  import * as Empty from "./vendor/components/ui/empty/index.js";
  import { Button } from "./vendor/components/ui/button/index.js";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import CollectionState from "./pieces/CollectionState.svelte";
  import SearchField from "./pieces/SearchField.svelte";
  import { retrieveCollection } from "./collection-retrieval.ts";
  let { node, select }: { node: BankNodeFor<"collection">; select: (id: string) => void } = $props();
  let { records, disabled, loaded, selectedId } = $derived(node);
  let query = $state("");
  const searchId = $props.id();
  let visibleRecords = $derived(retrieveCollection(records, node.fields, query));
  let fieldLabels = $derived(node.fields.map(field => node.labels[`${node.object}.${field}`] ?? field));
</script>
<Field.FieldGroup data-collection-search class="mb-4">
  <Field.Field>
    <Field.Label class="sr-only" for={searchId}>Search loaded records</Field.Label>
    <SearchField id={searchId} bind:value={query} placeholder="Search loaded records"
      disabled={!loaded || records.length === 0} aria-describedby={`${searchId}-help`} />
    <Field.Description id={`${searchId}-help`}>Only loaded collection values are searched: {fieldLabels.join(", ")}.</Field.Description>
  </Field.Field>
</Field.FieldGroup>
<p class="mb-4 type-caption text-muted-foreground">Sorted by {fieldLabels[0]} · ascending</p>
{#if loaded && records.length > 0 && query.trim().length > 0}
  <p class="mb-4 type-caption text-muted-foreground" role="status" aria-live="polite">{visibleRecords.length} of {records.length} loaded records</p>
{/if}
{#if visibleRecords.length}<GroupedPanel>
<ul class="records" data-composition="collection" data-grouped-rows>
  {#each visibleRecords as record (record.id)}
    <li data-grouped-row>
      <Button variant="row" data-grouped-action class="record-button flex-col items-stretch justify-center gap-1.5 px-4 py-3 aria-[current=true]:bg-muted" onclick={() => select(record.id)} {disabled} aria-current={record.id === selectedId ? "true" : undefined}>
        <span data-record-heading><strong>{presentTitle(record.facts[node.fields[0]!])}</strong><ChevronRight data-icon="inline-end" data-control-chevron aria-hidden="true" /></span>
        {#if node.fields.length > 1}
          <span data-record-metadata>{#each node.fields.slice(1) as field}<span>{node.labels[`${node.object}.${field}`]} · {presentFact(record.facts[field])}</span>{/each}</span>
        {/if}
      </Button>
    </li>
  {/each}
</ul>
</GroupedPanel>{/if}
{#if !records.length}
  <CollectionState {loaded} createLabel={node.createLabel} />
{:else if !visibleRecords.length}
  <Empty.Root role="group" aria-label="Collection search results">
    <Empty.Header>
      <Empty.Title role="heading" aria-level={2}>No matching records.</Empty.Title>
      <Empty.Description>Try another search or clear it to show all loaded records.</Empty.Description>
    </Empty.Header>
  </Empty.Root>
{/if}
