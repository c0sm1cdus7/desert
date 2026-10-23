<script lang="ts">
  import type {AttentionSignal} from '../../attention.ts';
  import AttentionIndicator from './AttentionIndicator.svelte';
  import GroupedPanel from './GroupedPanel.svelte';
  let {signals}:{signals:readonly AttentionSignal[]}=$props();
</script>
{#if signals.length}
  <GroupedPanel><div data-attention-status class="flex items-center gap-4 px-4 py-3">
    <AttentionIndicator required />
    <p class="type-body">{signals.length===1?'Requires your attention':`${signals.length} pending activities require your attention`}</p>
  </div></GroupedPanel>
{/if}
