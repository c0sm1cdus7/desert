<script lang="ts">
  import BankRenderer from "../BankRenderer.svelte";
  import { BankVersion } from "../../interaction/bank-node.ts";
  import SelectionField from "../pieces/SelectionField.svelte";
  import MeasuredField from "../pieces/MeasuredField.svelte";
  import { selectNode, applyControlEvent } from "../../interaction/control-nodes.ts";
  import type { ControlProps, ControlEventFor } from "../renderer-contracts.ts";
  let { node, onevent }: ControlProps<"select"> = $props();
  let checked = $derived(selectNode(node));
  const id = $props.id();
  function change(value: string | null) {
    const event: ControlEventFor<"select"> = { kind: "select.change", control: checked.id, value };
    applyControlEvent(checked, event);
    onevent(event);
  }
</script>
<MeasuredField measure="choice" data-disabled={checked.disabled} data-control="select">
  <SelectionField {id} selection={checked.id} label={checked.label} value={checked.value} options={checked.options}
    disabled={checked.disabled} required={checked.required} fieldControl onchange={change} />
  {#if !checked.required}<BankRenderer node={{ version: BankVersion, kind: "action", role: "secondary", action: {
    icon: "close", label: "Clear selection", state: checked.disabled || checked.value === null ? "unavailable" : "ready",
    intent: { kind: "selection.clear" },
  } }} onevent={event => { if (event.kind === "local.invoke" && event.intent.kind === "selection.clear") change(null); }} />{/if}
</MeasuredField>
