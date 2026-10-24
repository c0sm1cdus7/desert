<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { ResolvedNodeVersion } from "../../../../interaction/resolved-node.ts";
  import { NodeRenderer } from "../../index.ts";
  let { actions, invoke }: CatalogProps<"utility-actions"> = $props();
</script>

<!-- One utility-action arrangement shared by anchored and frame hosts. -->
<div class="flex min-w-0 flex-col gap-3" data-utility-actions>
  {#each actions as action}
    <NodeRenderer node={{ version: ResolvedNodeVersion, kind: "action", action, role: "secondary" }}
      onevent={event => { if (event.kind === "surface.invoke") invoke(event.intent); }} />
  {/each}
</div>
