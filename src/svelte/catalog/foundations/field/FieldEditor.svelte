<script lang="ts">
  // The editor inside a Field's well: a single line (plain, credential or masked) or a multiline editor that grows to
  // the reading area. `writing` is the live text of a plain editor, `shown` the formatted text of a masked one.
  import * as Group from "../../../vendor/components/ui/input-group/index.js";
  import type { InputMask } from "../../../../interaction/input-mask.ts";
  import MaskedInput from "./MaskedInput.svelte";
  import { observeEditorCapacity } from "./editor-capacity.ts";
  let { id, primitive, label, purpose, value, placeholder, mask, identity, required, disabled, invalid, describedBy, focus, controls,
    writing = $bindable(""), shown = $bindable(""), onchange, onmasked }: {
    id: string; primitive: "input.text" | "input.multiline"; label: string;
    purpose: "text" | "username" | "new-password" | "current-password" | "search" | undefined; value: string; placeholder: string | undefined;
    mask: InputMask | undefined; identity: string | undefined; required: boolean; disabled: boolean; invalid: boolean;
    describedBy: string | undefined; focus: "on-mount" | undefined; controls: string | undefined; writing?: string; shown?: string;
    onchange: (value: string) => void; onmasked: (value: string, valid: boolean, complete: boolean) => void;
  } = $props();
  let editor = $state<HTMLTextAreaElement | null>(null);
  let line = $state<HTMLInputElement | null>(null);
  $effect(() => { if (editor) return observeEditorCapacity(editor); });
  $effect(() => { if (focus === "on-mount" && line) line.focus({ preventScroll: true }); });
</script>
{#if primitive === "input.multiline"}
  <Group.Textarea {id} bind:ref={editor} bind:value={writing} {required} {disabled} aria-required={required} aria-invalid={invalid}
    aria-label={label} rows={4} placeholder=" " aria-describedby={describedBy} class="focus-visible:outline-none"
    data-field-editor="multiline" onblur={event => onchange(event.currentTarget.value)} oninput={event => onchange(event.currentTarget.value)} />
{:else if mask}
  <MaskedInput {id} {value} {mask} {identity} bind:display={shown} {required} {disabled} {invalid} {label} {describedBy}
    placeholder={placeholder ?? " "} onvalue={onmasked} />
{:else}
  <Group.Input {id} bind:ref={line} type={purpose?.endsWith("password") ? "password" : "text"}
    autocomplete={purpose === "text" || purpose === "search" || purpose === undefined ? undefined : purpose} autocapitalize={purpose === "username" ? "none" : undefined}
    spellcheck={purpose === "text" ? undefined : false} bind:value={writing} {required} {disabled} aria-required={required}
    aria-invalid={invalid} aria-label={label} placeholder={placeholder ?? " "} aria-describedby={describedBy} aria-controls={controls}
    class="focus-visible:outline-none" onblur={event => onchange(event.currentTarget.value)} oninput={event => onchange(event.currentTarget.value)} />
{/if}
