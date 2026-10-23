<script lang="ts">
  import type { FrameContent } from "../../interaction/surface-frame.ts";
  import FactRow from "./FactRow.svelte";
  import { groupRelatedItems } from "../../interaction/content-groups.ts";
  let { items }: Pick<Extract<FrameContent, { kind: "information" }>, "items"> = $props();
</script>
<div class="grid min-w-0 gap-4 break-words" data-reading-measure>
  {#each groupRelatedItems(items) as group}
    {#if group[0]?.kind === "text"}<p class="type-body min-w-0 px-4">{group[0].text}</p>
    {:else}<dl class="bank-stack" data-material="pane">
      {#each group as item}{#if item.kind === "fact"}<FactRow label={item.label} value={item.value} />{/if}{/each}
    </dl>{/if}
  {/each}
</div>
