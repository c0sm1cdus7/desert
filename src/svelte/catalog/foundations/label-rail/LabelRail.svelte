<script lang="ts">
  import { Tag } from '../../index.ts';
  import type { CatalogProps } from '../../types.d.ts';
  // A rail of neutral Tag chips; this folder stays until Batch 3 prunes it (its callers move to an Inline of Tags).
  let {values,disabled=false,onremove}:CatalogProps<'label-rail'>=$props();
</script>
<ul class="label-rail" aria-label="Labels">
  {#each values as value,index (index)}<li class="label-rail-item"><Tag presentation="chip" tone="neutral" label={value} state="known"
    removable={!!onremove} removeLabel={onremove ? `Remove ${value}` : undefined} {disabled} onremove={() => onremove?.(index)} /></li>{/each}
</ul>
<style>
  .label-rail {display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;margin:0;padding:0;list-style:none;min-width:0;}
  .label-rail-item {max-width:100%;min-width:0;}
</style>
