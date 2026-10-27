<script lang="ts">
  import { controlResolvedNode } from "../../../../interaction/resolved-node.ts";
  import { NodeRenderer } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { node, onevent }: CatalogProps<"control-renderer"> = $props();
</script>
<NodeRenderer node={controlResolvedNode(node)} onevent={event => { if ("control" in event) onevent?.(event); }} />
