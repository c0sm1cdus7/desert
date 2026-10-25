<script lang="ts">
  import { Action, Choice, Column } from "../../index.ts";
  import { selectNode, selectInputRequired, applyControlEvent } from "../../../../interaction/control-nodes.ts";
  import type { ControlEventFor } from "../../../renderer-contracts.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  let { node, onevent }: CatalogProps<"select-control"> = $props();
  let checked = $derived(selectNode(node));
  function change(value: string | null) {
    const event: ControlEventFor<"select"> = { kind: "select.change", control: checked.id, value };
    applyControlEvent(checked, event);
    onevent?.(event);
  }
</script>
<!-- The field well at the choice measure; an optional choice offers to clear it 0.5rem below. -->
<Column gap="snug">
  <Choice presentation="menu" cardinality="one" menuTrigger="well" measure="choice" label={checked.label} labelVisibility="visible"
    selected={checked.value === null ? [] : [checked.value]} disabled={checked.disabled}
    required={selectInputRequired(checked)} options={checked.options.map(option => ({ value: option.value, label: option.label,
      disabled: option.disabled, ...option.face ? { leading: { kind: "face" as const, face: option.face } } : {} }))}
    onchange={selected => { if (selected[0] !== undefined) change(selected[0]); }} />
  {#if !checked.required}
    <Action icon="close" label={say(m.selectControl.clear)} emphasis="secondary" face="fit" type="button"
      state={checked.disabled || checked.value === null ? "unavailable" : "ready"} onclick={() => change(null)} />
  {/if}
</Column>
