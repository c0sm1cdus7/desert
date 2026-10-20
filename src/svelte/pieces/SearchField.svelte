<script lang="ts">
  import type { HTMLInputAttributes } from "svelte/elements";
  import * as InputGroup from "../vendor/components/ui/input-group/index.js";
  import Search from "@lucide/svelte/icons/search";
  import ClearInput from "./ClearInput.svelte";

  const generatedId = $props.id();
  let { id = generatedId, value = $bindable(""), ref = $bindable(null), onvalue, disabled = false, readonly = false, ...props }: {
    value?: string; ref?: HTMLInputElement | null; onvalue?: (value: string) => void;
  } & Omit<HTMLInputAttributes, "value" | "type" | "files" | "oninput" | "children"> = $props();
  let fieldId = $derived(id ?? generatedId);

  function update(next: string) { value = next; onvalue?.(next); }
</script>

<InputGroup.Root data-search-field data-disabled={disabled} aria-disabled={disabled || undefined}
  onclick={event => {
    if (!(event.target as Element).closest("button,input")) ref?.focus({ preventScroll: true });
  }}>
  <InputGroup.Input {...props} id={fieldId} bind:ref type="search" {value} {disabled} {readonly}
    autocomplete="off" oninput={event => update(event.currentTarget.value)} />
  <InputGroup.Addon align="inline-start"><Search data-search-icon="leading" aria-hidden="true" /></InputGroup.Addon>
  <ClearInput control={fieldId} {value} label="Clear search" disabled={!!(disabled || readonly)} />
</InputGroup.Root>
