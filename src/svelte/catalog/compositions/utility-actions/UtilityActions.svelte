<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { ResolvedNodeVersion } from "../../../../interaction/resolved-node.ts";
  import { Column, NodeRenderer } from "../../index.ts";
  let { actions, invoke }: CatalogProps<"utility-actions"> = $props();
</script>

<!-- One utility-action arrangement shared by anchored and frame hosts. -->
<Column gap="close">
  {#each actions as action}
    <NodeRenderer node={{ version: ResolvedNodeVersion, kind: "action", action, role: "secondary" }}
      onevent={event => { if (event.kind === "surface.invoke") invoke(event.intent); }} />
  {/each}
</Column>
