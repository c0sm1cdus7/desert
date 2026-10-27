<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { Column, FactValue, Spacer, StackLayout } from "../../index.ts";
  import { displayLabel } from '../../../../interaction/display-label.ts';
  import { readingFields } from '../../../../interaction/fact-presentation.ts';
  let { fields, facts, object, labels }: CatalogProps<"reading-content"> = $props();
  const visible = $derived(readingFields(fields, facts));
</script>
{#if visible.length}
<!-- The empty last track keeps one more gap after the prose, which separates it from the properties that follow. -->
<Column gap="relaxed">
  {#each visible as field}
    <StackLayout title={displayLabel(labels[`${object}.${field}`]!)}>
      <FactValue value={typeof facts[field] === "string" ? facts[field] : undefined} presentation="paragraph" />
    </StackLayout>
  {/each}
  <Spacer size="fill" />
</Column>
{/if}
