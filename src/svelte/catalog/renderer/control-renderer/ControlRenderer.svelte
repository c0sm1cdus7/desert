<script lang="ts">
  import type { ControlNode, ControlEvent } from "../../../../interaction/control-nodes.ts";
  import { controlResolvedNode } from "../../../../interaction/resolved-node.ts";
  import { NodeRenderer } from "../../index.ts";
  import type { LocalFileHost } from "../../../infra/file-host.ts";
  let { node, onevent, host }: { node: ControlNode; onevent: (event: ControlEvent) => void; host: LocalFileHost } = $props();
</script>
<NodeRenderer node={controlResolvedNode(node)} {host} onevent={event => { if ("control" in event) onevent(event); }} />
