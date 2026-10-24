<script lang="ts">
  import { NodeRenderer } from "../../index.ts";
  import { ResolvedNodeVersion } from "../../../../interaction/resolved-node.ts";
  import { SelectionField } from "../../index.ts";
  import { MeasuredField } from "../../index.ts";
  import { selectNode, selectInputRequired, applyControlEvent } from "../../../../interaction/control-nodes.ts";
  import type { ControlEventFor } from "../../../renderer-contracts.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { node, onevent }: CatalogProps<"select-control"> = $props();
  let checked = $derived(selectNode(node));
  const id = $props.id();
  function change(value: string | null) {
    const event: ControlEventFor<"select"> = { kind: "select.change", control: checked.id, value };
    applyControlEvent(checked, event);
    onevent?.(event);
  }
</script>
<MeasuredField kind="control.select" disabled={checked.disabled}>
  <SelectionField {id} selection={checked.id} label={checked.label} value={checked.value} options={checked.options}
    disabled={checked.disabled} required={selectInputRequired(checked)} fieldControl onchange={change} />
  {#if !checked.required}<NodeRenderer node={{ version: ResolvedNodeVersion, kind: "action", role: "secondary", action: {
    icon: "close", label: "Clear selection", state: checked.disabled || checked.value === null ? "unavailable" : "ready",
    intent: { kind: "selection.clear" },
  } }} onevent={event => { if (event.kind === "local.invoke" && event.intent.kind === "selection.clear") change(null); }} />{/if}
</MeasuredField>
