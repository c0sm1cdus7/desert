<script lang="ts">
  import type { ControlNode, ControlEvent } from "../../interaction/control-nodes.ts";
  import { controlBankNode } from "../../interaction/bank-node.ts";
  import BankRenderer from "../BankRenderer.svelte";
  import type { LocalFileHost } from "./file-host.ts";
  let { node, onevent, host }: { node: ControlNode; onevent: (event: ControlEvent) => void; host: LocalFileHost } = $props();
</script>
<BankRenderer node={controlBankNode(node)} {host} onevent={event => { if ("control" in event) onevent(event); }} />
