<script lang="ts">
  import { Icon } from '../../index.ts';
  import type { CatalogProps } from "../../types.d.ts";
  let { kind }: CatalogProps<"artwork-placeholder"> = $props();
</script>

<div data-media-artwork-placeholder aria-label={kind === 'audio' ? 'No cover artwork' : 'No video poster'}>
  {#if kind === 'audio'}<Icon name="music-2" decorative />{:else}<Icon name="film" decorative />{/if}
</div>
