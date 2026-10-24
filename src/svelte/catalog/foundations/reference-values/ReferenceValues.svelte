<script lang='ts'>
  import { Tag } from '../../index.ts';
  import type { CatalogProps } from '../../types.d.ts';
  // References read as text Tags; this folder stays until Batch 3 prunes it (its callers move to an Inline of Tags).
  let {values,options}:CatalogProps<'reference-values'>=$props();
</script>
<span class="reference-values">
  {#each values as value (value)}
    {@const option=options.find(item => item.value === value)}
    {#if option}<Tag presentation="text" label={option.label} color={option.color} state="known" removable={false} disabled={false} />
    {:else}<Tag presentation="text" label="Unavailable" state="unavailable" removable={false} disabled={false} />{/if}
  {/each}
</span>
<style>
  .reference-values {display:flex;flex-wrap:wrap;gap:.35em .8em;justify-content:inherit;min-width:0;}
</style>
