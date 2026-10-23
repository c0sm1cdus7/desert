<script lang="ts">
  import * as InputGroup from "../../../vendor/components/ui/input-group/index.js";
  import Search from "@lucide/svelte/icons/search";
  import ClearInput from "../clear-input/ClearInput.svelte";

  const generatedId = $props.id();
  let { id = generatedId, value = $bindable(""), ref = $bindable(null), onvalue, disabled = false, readonly = false,
    placeholder, "aria-label": label, "aria-controls": controls, tabindex, onready }: {
    id?: string; placeholder?: string; disabled?: boolean; readonly?: boolean;
    "aria-label"?: string; "aria-controls"?: string; tabindex?: -1 | 0;
    value?: string; ref?: HTMLInputElement | null; onvalue?: (value: string) => void;
    onready?: (element: HTMLInputElement | null) => void;
  } = $props();
  let fieldId = $derived(id ?? generatedId);
  $effect(() => { onready?.(ref); return () => onready?.(null); });

  function update(next: string) { value = next; onvalue?.(next); }
</script>

<InputGroup.Root data-search-field data-disabled={disabled} aria-disabled={disabled || undefined}
  onclick={event => {
    if (!(event.target as Element).closest("button,input")) ref?.focus({ preventScroll: true });
  }}>
  <InputGroup.Input id={fieldId} bind:ref type="search" {value} {disabled} {readonly}
    {placeholder} aria-label={label} aria-controls={controls} {tabindex}
    autocomplete="off" oninput={event => update(event.currentTarget.value)} />
  <InputGroup.Addon align="inline-start"><Search data-search-icon="leading" aria-hidden="true" /></InputGroup.Addon>
  <ClearInput control={fieldId} {value} label="Clear search" disabled={!!(disabled || readonly)} />
</InputGroup.Root>
