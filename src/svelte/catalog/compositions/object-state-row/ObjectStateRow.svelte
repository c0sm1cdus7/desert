<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { Choice, FactRow } from "../../index.ts";
  let { selector, onselect }: CatalogProps<"object-state-row"> = $props();
  /** Picking an available state other than the current one raises its journey; the owner decides what changes. */
  function choose(value: string | undefined) {
    const option = selector.options.find(option => option.value === value);
    if (!selector.disabled && value !== selector.value && option?.available) onselect?.(option.journey);
  }
</script>
<FactRow kind="control" label={selector.label}>
  {#snippet control()}<Choice presentation="menu" cardinality="one" menuTrigger="contextual" label={selector.label} labelVisibility="visible"
      selected={selector.value === null ? [] : [selector.value]} disabled={selector.disabled} required={false}
      options={selector.options.map(option => ({ value: option.value, label: option.label,
        disabled: option.value !== selector.value && !option.available }))}
      onchange={selected => choose(selected[0])} />{/snippet}
</FactRow>
