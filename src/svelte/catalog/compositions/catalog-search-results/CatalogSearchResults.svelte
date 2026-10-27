<script lang="ts">
  import { Column, Grid, Heading, List, NodeRenderer, Row, Status, Text } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  let { title, description, query, results, onselect }: CatalogProps<"catalog-search-results"> = $props();
  let count = $derived(say(results.length === 1 ? m.catalogSearchResults.one : m.catalogSearchResults.many, { count: String(results.length) }));
</script>

<!-- What a search in one destination found: a prompt before a query, then its count and its record cards or result rows.
     A result row answers to `search:<id>` in the workspace's focus scope, so a return can come back to it. -->
<Column gap="relaxed" fill>
  {#if !query.trim()}
    <Status icon="search" title={say(m.catalogSearchResults.prompt, { title })} {description} tone="neutral" size="prompt" heading />
  {:else}
    <Column gap="snug">
      <Heading kind="page" text={say(m.catalogSearchResults.heading, { title })} />
      <Text kind="support" tone="muted" live="polite" text={count} />
    </Column>
    {#if !results.length}
      <Status title={say(m.catalogSearchResults.empty)} description={say(m.catalogSearchResults.another, { title })} tone="neutral"
        size="regular" heading={false} />
    {:else if results[0]?.kind === "record"}
      <Grid tracks="results" gap="close">
        {#each results as result (result.id)}
          {#if result.kind === "record"}<NodeRenderer node={result.node} onevent={event => { if (event.kind === "catalog.open") onselect?.(result); }} />{/if}
        {/each}
      </Grid>
    {:else}
      <List kind="rows" measure="reading">
        {#each results as result (result.id)}
          {#if result.kind !== "record"}<Row label={result.title} description={result.description} trailing="chevron" interaction="open"
            available current={false} focusKey={`search:${result.id}`} onopen={() => onselect?.(result)} />{/if}
        {/each}
      </List>
    {/if}
  {/if}
</Column>
