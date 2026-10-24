<script lang="ts">
  import AnchoredSurface from "./AnchoredSurface.svelte";
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
<AnchoredSurface label={checked.label} open={checked.open} disabled={checked.disabled} locked={checked.locked}
  title={checked.title} content={{ kind: "information", items: checked.content }} onchange={change} />
