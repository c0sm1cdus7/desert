<script lang="ts">
  import type { Snippet } from "svelte";
  let { label, labelId, description, descriptionId, children }: {
    label: string; labelId?: string | undefined;
    description?: string | undefined; descriptionId?: string | undefined;
    children: Snippet;
  } = $props();
</script>

<!-- One visual anatomy. Radio/checkbox/listbox behavior belongs to its host. -->
<span data-choice-anatomy data-grouped-content>
  {@render children()}
  <span data-choice-copy>
    <span id={labelId} data-choice-title class="type-control">{label}</span>
    {#if description}<span id={descriptionId} class="type-caption text-muted-foreground">{description}</span>{/if}
  </span>
</span>
