<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { readingFields } from "../../../../interaction/fact-presentation.ts";
  import { FactRow, List, ObjectStateRow, StackLayout } from "../../index.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  let { fields, facts, object, labels, references = {}, selectors = [], onselect }: CatalogProps<"context-properties"> = $props();
  const visible = $derived(readingFields(fields, facts));
</script>
{#if visible.length || (selectors.length && onselect)}
  <StackLayout title={say(m.contextProperties.title)}>
    <List kind="facts" measure="reading">
      {#each visible as field}
        <FactRow kind="value" label={labels[`${object}.${field}`]!} value={Object.hasOwn(facts, field) ? facts[field] : undefined} references={references[field]} />
      {/each}
      {#if onselect}{#each selectors as selector}<ObjectStateRow {selector} {onselect}/>{/each}{/if}
    </List>
  </StackLayout>
{/if}
