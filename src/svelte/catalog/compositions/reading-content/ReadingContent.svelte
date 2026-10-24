<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { StackLayout } from "../../index.ts";
  import { FactValue } from "../../index.ts";
  import { displayLabel } from '../../../../interaction/display-label.ts';
  import { readingFields } from '../../../../interaction/fact-presentation.ts';
  let { fields, facts, object, labels }: CatalogProps<"reading-content"> = $props();
  const visible = $derived(readingFields(fields, facts));
</script>
{#if visible.length}
<div class="reading-content" data-composition="reading-content">
  {#each visible as field}
    <StackLayout title={displayLabel(labels[`${object}.${field}`]!)}>
      <p class="reading-copy"><FactValue value={typeof facts[field] === "string" ? facts[field] : undefined} /></p>
    </StackLayout>
  {/each}
</div>
{/if}
