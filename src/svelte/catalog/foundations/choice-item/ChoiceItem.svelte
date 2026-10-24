<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  let { label, labelId, description, descriptionId, children }: CatalogProps<"choice-item"> = $props();
</script>

<!-- One visual anatomy. Radio/checkbox/listbox behavior belongs to its host. -->
<span class="control-feedback-content" data-choice-anatomy data-grouped-content>
  {@render children?.()}
  <span data-choice-copy>
    <span id={labelId} data-choice-title class="type-control">{label}</span>
    {#if description}<span id={descriptionId} class="type-caption text-muted-foreground">{description}</span>{/if}
  </span>
</span>
