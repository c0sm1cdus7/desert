<script lang="ts">
  import { untrack } from "svelte";
  import * as Field from "../../../vendor/components/ui/field/index.js";
  import * as Group from "../../../vendor/components/ui/input-group/index.js";
  import type { InputMask } from "../../../../interaction/input-mask.ts";
  import FieldWell from "../field-well/FieldWell.svelte";
  import MeasuredField from "../measured-field/MeasuredField.svelte";
  import MaskedInput from "../masked-input/MaskedInput.svelte";
  import CharacterCounter from "../character-counter/CharacterCounter.svelte";
  import ClearInput from "../clear-input/ClearInput.svelte";
  import { observeEditorCapacity } from "./editor-capacity.ts";
  let { primitive, label, value = "", required = false, invalid = false, error, helper, disabled = false,
    identity = "", mask, maxLength, purpose = "text", onchange }: {
    label: string; value?: string; required?: boolean; identity?: string; maxLength?: number | undefined;
    invalid?: boolean; error?: string | undefined; helper?: string | undefined; disabled?: boolean; onchange: (value: string) => void;
    purpose?: "text" | "username" | "new-password" | "current-password";
  } & ({ primitive: "input.text"; mask?: InputMask | undefined } | { primitive: "input.multiline"; mask?: never }) = $props();
  const id = $props.id();
  let writing = $derived(value);
  let editor = $state<HTMLTextAreaElement | null>(null);
  $effect(() => { if (editor) return observeEditorCapacity(editor); });
  let display = $state(""), draftError = $state("");
  const context = () => `${identity}/${primitive}/${mask?.kind ?? ""}/${mask?.locale ?? ""}/${mask?.scale ?? ""}`;
  let observed = untrack(() => ({ value, context: context() }));
  let pending: string[] = [];
  $effect(() => {
    const next = { value, context: context() };
    untrack(() => {
      const acknowledgement = pending.indexOf(next.value);
      if (next.context !== observed.context || next.value !== observed.value && acknowledgement < 0) {
        draftError = ""; pending = [];
      } else if (acknowledgement >= 0) pending.splice(0, acknowledgement + 1);
      observed = next;
    });
  });
  let message = $derived(error || draftError);
  let describedBy = $derived([
    helper ? `${id}-helper` : undefined,
    primitive === "input.multiline" ? `${id}-counter` : undefined,
    message ? `${id}-error` : undefined,
  ].filter(Boolean).join(" ") || undefined);
  let invalidField = $derived(invalid || !!message);
  function editMasked(next: string, valid: boolean, complete: boolean) {
    if (disabled) return;
    draftError = valid && complete ? "" : valid ? "Enter a complete number." :
      `Enter a number with up to ${mask!.scale} decimal places using this field's format.`;
    if (valid && complete) { pending.push(next); onchange(next); }
  }
</script>
{#snippet counter()}<CharacterCounter id={`${id}-counter`} value={writing} {maxLength} />{/snippet}
<MeasuredField kind={primitive} invalid={invalidField} {disabled}>
  <FieldWell {id} {label} {required} footer={primitive === "input.multiline" ? counter : undefined}
    filled={(mask ? display : writing).length > 0}>
    {#snippet accessory()}<ClearInput control={id} value={mask ? display : writing} label={`Clear ${label}`} {disabled} />{/snippet}
    {#if primitive === "input.multiline"}
      <Group.Textarea {id} bind:ref={editor} bind:value={writing} {required} {disabled} aria-required={required} aria-invalid={invalidField} aria-label={label} rows={4} placeholder=" "
        aria-describedby={describedBy} onblur={event => onchange(event.currentTarget.value)}
        class="focus-visible:outline-none"
        oninput={event => onchange(event.currentTarget.value)} />
    {:else if mask}
      <MaskedInput {id} {value} {mask} {identity} bind:display {required} {disabled}
        aria-required={required} aria-invalid={invalidField} aria-label={label} placeholder=" "
        aria-describedby={describedBy} onvalue={editMasked} />
    {:else}
      <Group.Input {id} type={purpose.endsWith("password") ? "password" : "text"} autocomplete={purpose === "text" ? undefined : purpose}
        autocapitalize={purpose === "username" ? "none" : undefined} spellcheck={purpose === "text" ? undefined : false}
        bind:value={writing} {required} {disabled} aria-required={required} aria-invalid={invalidField} aria-label={label} placeholder=" "
        aria-describedby={describedBy} onblur={event => onchange(event.currentTarget.value)}
        class="focus-visible:outline-none"
        oninput={event => onchange(event.currentTarget.value)} />
    {/if}
  </FieldWell>
  {#if helper}<Field.FieldDescription id={`${id}-helper`}>{helper}</Field.FieldDescription>{/if}
  {#if message}<Field.FieldError id={`${id}-error`} role="status">{message}</Field.FieldError>{/if}
</MeasuredField>
