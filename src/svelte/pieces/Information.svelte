<script lang="ts">
  import type { FrameContent } from "../../interaction/surface-frame.ts";
  import FactValue from "./FactValue.svelte";
  let { items }: Pick<Extract<FrameContent, { kind: "information" }>, "items"> = $props();
</script>
<div class="grid min-w-0 gap-4 break-words">
  {#each items as item}
    {#if item.kind === "text"}<p class="type-body">{item.text}</p>
    {:else}<dl class="bank-stack" data-material="pane"><div class="fact-row"><dt class="fact-label type-support">{item.label}</dt><dd class="fact-value type-body"><FactValue value={item.value} /></dd></div></dl>{/if}
  {/each}
</div>
