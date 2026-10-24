<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { displayLabel } from "../../../../interaction/display-label.ts";
  import { SelectionField } from "../../index.ts";
  let { selector, onselect }: CatalogProps<"object-state-row"> = $props();
</script>
<div class="fact-row object-state-row" data-primitive="object-state-row">
  <dt class="fact-label type-support">{displayLabel(selector.label)}</dt>
  <dd class="fact-value type-body">
    <SelectionField selection={selector.field} label={selector.label} value={selector.value} contextual
      disabled={selector.disabled} options={selector.options.map(option => ({ value: option.value, label: option.label,
        disabled: option.value !== selector.value && !option.available }))}
      onchange={value => {
        const option = selector.options.find(option => option.value === value);
        if (!selector.disabled && value !== selector.value && option?.available) onselect?.(option.journey);
      }} />
  </dd>
</div>
<style>
  .object-state-row { align-items:center; }
</style>
