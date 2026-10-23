<script lang="ts">
  import NodeRenderer from "../../renderer/node-renderer/NodeRenderer.svelte";
  import { ResolvedNodeVersion } from "../../../../interaction/resolved-node.ts";
  import SelectionField from "../../foundations/selection-field/SelectionField.svelte";
  import MeasuredField from "../../foundations/measured-field/MeasuredField.svelte";
  import { selectNode, selectInputRequired, applyControlEvent } from "../../../../interaction/control-nodes.ts";
  import type { ControlProps, ControlEventFor } from "../../../renderer-contracts.ts";
  let { node, onevent }: ControlProps<"select"> = $props();
  let checked = $derived(selectNode(node));
  const id = $props.id();
  function change(value: string | null) {
    const event: ControlEventFor<"select"> = { kind: "select.change", control: checked.id, value };
    applyControlEvent(checked, event);
    onevent(event);
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
