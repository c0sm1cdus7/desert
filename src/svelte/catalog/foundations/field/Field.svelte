<script lang="ts">
  import { untrack } from "svelte";
  import * as Vendor from "../../../vendor/components/ui/field/index.js";
  import FieldWell from "./FieldWell.svelte";
  import FieldEditor from "./FieldEditor.svelte";
  import FieldTrigger from "./FieldTrigger.svelte";
  import SearchWell from "./SearchWell.svelte";
  import CharacterCounter from "./CharacterCounter.svelte";
  import ClearInput from "./ClearInput.svelte";
  import type { CatalogProps } from "../../types.d.ts";
  let { primitive, label, labelVisibility, required, invalid, disabled, helper, error, identity, measure, purpose, value, placeholder,
    mask, maxLength, clear, focus, display, disclosure, onchange, onmasked, onopen, accessory: trailing, prefix }: CatalogProps<"field"> = $props();
  const id = $props.id();
  // Both editors receive their value; the trigger owns none. `writing` is the live text, `shown` a mask's formatted text.
  let written = $derived(typeof value === "string" ? value : "");
  let writing = $derived(written);
  let shown = $state("");
  let draft = $derived(mask ? shown : writing);
  let draftError = $state("");
  // A rejected or incomplete masked edit keeps its message until the owner's value or the field's identity changes.
  const context = () => `${identity ?? ""}/${primitive}/${mask?.kind ?? ""}/${mask?.locale ?? ""}/${mask?.scale ?? ""}`;
  let observed = untrack(() => ({ value: written, context: context() }));
  let pending: string[] = [];
  $effect(() => {
    const next = { value: written, context: context() };
    untrack(() => {
      const acknowledgement = pending.indexOf(next.value);
      if (next.context !== observed.context || next.value !== observed.value && acknowledgement < 0) { draftError = ""; pending = []; }
      else if (acknowledgement >= 0) pending.splice(0, acknowledgement + 1);
      observed = next;
    });
  });
  let message = $derived(error || draftError);
  let marked = $derived(invalid || !!message);
  let multiline = $derived(primitive === "input.multiline");
  let describedBy = $derived([helper ? `${id}-helper` : undefined, multiline ? `${id}-counter` : undefined,
    message ? `${id}-error` : undefined].filter(Boolean).join(" ") || undefined);
  function edited(next: string, valid: boolean, complete: boolean) {
    if (disabled || !mask) return;
    onmasked?.({ value: next, valid, complete });
    draftError = valid && complete ? "" : valid ? "Enter a complete number." :
      `Enter a number with up to ${mask.scale} decimal places using this field's format.`;
    if (valid && complete) { pending.push(next); onchange?.(next); }
  }
</script>
{#snippet counter()}<CharacterCounter id={`${id}-counter`} value={writing} {maxLength} />{/snippet}
{#snippet editor()}
  {#if primitive !== "trigger"}
    <FieldEditor {id} {primitive} {label} {purpose} value={written} {placeholder} {mask} {identity} {required} {disabled} {focus}
      invalid={marked} {describedBy} bind:writing bind:shown onchange={next => onchange?.(next)} onmasked={edited} />
  {/if}
{/snippet}
<div data-field data-field-filled={primitive === "trigger" || draft.length > 0} data-measure={measure}>
  <Vendor.Field data-primitive={primitive} data-invalid={marked} data-disabled={disabled}>
    {#if primitive === "trigger" && display && disclosure}
      <FieldTrigger {label} {labelVisibility} {required} {disabled} {describedBy} {display} {disclosure}
        onopen={() => onopen?.()} />
    {:else if purpose === "search"}
      <SearchWell {id} {label} {placeholder} {disabled} invalid={marked} {describedBy} {focus} bind:writing onchange={next => onchange?.(next)} />
    {:else}
      <FieldWell {id} {label} {labelVisibility} {required} filled={draft.length > 0} {prefix} footer={multiline ? counter : undefined}>
        {#snippet accessory()}
          {#if trailing}{@render trailing()}
          {:else if multiline || clear}<ClearInput control={id} value={draft} label={`Clear ${label}`} {disabled} />{/if}
        {/snippet}
        {@render editor()}
      </FieldWell>
    {/if}
    {#if helper}<Vendor.FieldDescription id={`${id}-helper`}>{helper}</Vendor.FieldDescription>{/if}
    {#if message}<Vendor.FieldError id={`${id}-error`} role="status">{message}</Vendor.FieldError>{/if}
  </Vendor.Field>
</div>
