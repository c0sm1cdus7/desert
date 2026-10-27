<script lang="ts">
  import { Popover } from "../../index.ts";
  import { FrameBody } from "../../index.ts";
  import { popoverNode, applyControlEvent } from "../../../../interaction/control-nodes.ts";
  import type { ControlEventFor } from "../../../renderer-contracts.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { node, onevent }: CatalogProps<"popover-control"> = $props();
  let checked = $derived(popoverNode(node));
  function change(open: boolean) {
    const event: ControlEventFor<"popover"> = { kind: "popover.open", control: checked.id, open };
    applyControlEvent(checked, event);
    onevent?.(event);
  }
</script>
<Popover label={checked.title} open={checked.open} disabled={checked.disabled} locked={checked.locked === true} content="information"
  placement="anchored" align="start" onopenchange={change}
  trigger={{ kind: "action", label: checked.label, icon: "open", face: "fit", emphasis: "secondary", state: "ready" }}>
  <FrameBody content={{ kind: "information", items: checked.content }} invoke={() => {}} edit={() => {}} />
</Popover>
