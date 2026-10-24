<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { AttentionIndicator } from '../../index.ts';
  import { GroupedPanel } from '../../index.ts';
  let { signals }: CatalogProps<"attention-status"> = $props();
</script>
{#if signals.length}
  <GroupedPanel><div data-attention-status class="flex items-center gap-4 px-4 py-3">
    <AttentionIndicator required />
    <p class="type-body">{signals.length===1?'Requires your attention':`${signals.length} pending activities require your attention`}</p>
  </div></GroupedPanel>
{/if}
