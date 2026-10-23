<script lang="ts">
  import type { ControlNode, ControlEvent } from "../../../../interaction/control-nodes.ts";
  import { controlBankNode } from "../../../../interaction/bank-node.ts";
  import { ControlBankRenderer } from "../../../adapter-catalog.ts";
  import type { LocalFileHost } from "../../../infra/file-host.ts";
  let { node, onevent, host }: { node: ControlNode; onevent: (event: ControlEvent) => void; host: LocalFileHost } = $props();
</script>
<ControlBankRenderer node={controlBankNode(node)} {host} onevent={event => { if ("control" in event) onevent(event); }} />
