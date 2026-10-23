<script lang="ts">
  import type { FactsContent } from "../../../../interaction/surface-frame.ts";
  import StackLayout from "../../foundations/stack-layout/StackLayout.svelte";
  import FactValue from "../../foundations/fact-value/FactValue.svelte";
  import { displayLabel } from '../../../../interaction/display-label.ts';
  import { readingFields } from '../../../../interaction/fact-presentation.ts';
  let { fields, facts, object, labels }: Pick<FactsContent, "fields" | "facts" | "object" | "labels"> = $props();
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
