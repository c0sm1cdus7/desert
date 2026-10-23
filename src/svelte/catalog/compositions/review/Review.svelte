<script lang="ts">
  import type { FrameContent } from "../../../../interaction/surface-frame.ts";
  import NodeRenderer from "../../renderer/node-renderer/NodeRenderer.svelte";
  import { ResolvedNodeVersion } from "../../../../interaction/resolved-node.ts";
  let { details, recovery }: Extract<FrameContent, { kind: "review" }> = $props();
</script>
<div data-composition="review"><NodeRenderer node={{ version: ResolvedNodeVersion, kind: "fact", details }} /></div>
{#if recovery}<p class="mt-4 text-muted-foreground" role="status">{recovery}</p>{/if}
