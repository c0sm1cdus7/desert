<script lang="ts">
  import type { FrameContent } from "../../../../interaction/surface-frame.ts";
  import type { SurfaceIntent } from "../../../../interaction/intent.ts";
  import { ResolvedNodeVersion } from "../../../../interaction/resolved-node.ts";
  import NodeRenderer from "../../renderer/node-renderer/NodeRenderer.svelte";
  let { actions, invoke }: {
    actions: Extract<FrameContent, { kind: "utilities" }>["actions"];
    invoke: (intent: SurfaceIntent) => void;
  } = $props();
</script>

<!-- One utility-action arrangement shared by anchored and frame hosts. -->
<div class="flex min-w-0 flex-col gap-3" data-utility-actions>
  {#each actions as action}
    <NodeRenderer node={{ version: ResolvedNodeVersion, kind: "action", action, role: "secondary" }}
      onevent={event => { if (event.kind === "surface.invoke") invoke(event.intent); }} />
  {/each}
</div>
