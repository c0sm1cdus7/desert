<script lang="ts">
  import Music from '@lucide/svelte/icons/music-2';
  import Film from '@lucide/svelte/icons/film';
  import type { CatalogProps } from "../../types.d.ts";
  let { kind }: CatalogProps<"artwork-placeholder"> = $props();
</script>

<div data-media-artwork-placeholder aria-label={kind === 'audio' ? 'No cover artwork' : 'No video poster'}>
  {#if kind === 'audio'}<Music aria-hidden="true" />{:else}<Film aria-hidden="true" />{/if}
</div>
