<script lang="ts">
  import { Badge } from '../../../vendor/components/ui/badge/index.js';
  import { Button } from '../../../vendor/components/ui/button/index.js';
  import X from '@lucide/svelte/icons/x';
  import type { CatalogProps } from '../../types.d.ts';
  let {values,disabled=false,onremove}:CatalogProps<'label-rail'>=$props();
</script>
<ul class="label-rail" aria-label="Labels">
  {#each values as value,index (index)}<li><Badge variant="secondary" removable={!!onremove}><span>{value}</span>
    {#if onremove}<Button variant="secondary" size="label-remove" {disabled}
      aria-label={`Remove ${value}`} onclick={() => onremove?.(index)}><X aria-hidden="true"/></Button>{/if}
  </Badge></li>{/each}
</ul>
<style>
  .label-rail {display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;margin:0;padding:0;list-style:none;min-width:0;}
  li {max-width:100%;min-width:0;}
</style>
