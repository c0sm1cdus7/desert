<script lang="ts">
  import ColorBullet from './ColorBullet.svelte';
  import type { ReferenceState } from '../../interaction/labels-control.ts';
  let {values,options}:{values:readonly string[];options:ReferenceState['options']}=$props();
</script>
<span class="reference-values">
  {#each values as value (value)}
    {@const option=options.find(item => item.value === value)}
    <span class="reference-value">{#if option}{#if option.color}<ColorBullet color={option.color}/>{/if}{option.label}{:else}Unavailable{/if}</span>
  {/each}
</span>
<style>
  .reference-values {display:flex;flex-wrap:wrap;gap:.35em .8em;justify-content:inherit;min-width:0;}
  .reference-value {display:inline-flex;align-items:baseline;gap:.4em;min-width:0;overflow-wrap:anywhere;text-wrap:balance;}
</style>
