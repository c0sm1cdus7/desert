<script lang="ts">
  import type { FrameContent } from "../../../../interaction/surface-frame.ts";
  import BankRenderer from "../../renderer/bank-renderer/BankRenderer.svelte";
  import { BankVersion } from "../../../../interaction/bank-node.ts";
  let { details, recovery }: Extract<FrameContent, { kind: "review" }> = $props();
</script>
<div data-composition="review"><BankRenderer node={{ version: BankVersion, kind: "fact", details }} /></div>
{#if recovery}<p class="mt-4 text-muted-foreground" role="status">{recovery}</p>{/if}
