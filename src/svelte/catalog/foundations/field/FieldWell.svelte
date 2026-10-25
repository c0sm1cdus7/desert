<script lang="ts">
  // The rounded well of a Field: its persistent label above the editor, an optional prefix (a currency choice), the
  // trailing accessory (the clear control or the caller's action) and a footer (the character counter). A press on the
  // well's own surface focuses its editor.
  import type { Snippet } from "svelte";
  import * as Group from "../../../vendor/components/ui/input-group/index.js";
  import { cn } from "../../../vendor/utils.js";
  import FieldLabel from "./FieldLabel.svelte";
  // `filled` says the editor holds text; `raised` that its line shows text (the value or a placeholder), so the label
  // keeps its place above it instead of resting on the empty line.
  let { id, label, labelVisibility, required, filled, raised, prefix, accessory, footer, children }: {
    id: string; label: string; labelVisibility: "visible" | "accessible"; required: boolean; filled: boolean; raised: boolean;
    prefix: Snippet | undefined; accessory: Snippet; footer: Snippet | undefined; children: Snippet;
  } = $props();
  function focusEditor(event: MouseEvent) {
    if (event.defaultPrevented || !(event.target instanceof Element)) return;
    if (event.target.closest('input, textarea, button, select, a, label, [contenteditable]')) return;
    const editor = document.getElementById(id);
    if ((editor instanceof HTMLInputElement || editor instanceof HTMLTextAreaElement) && !editor.disabled) {
      editor.focus({ preventScroll: true });
    }
  }
</script>
<Group.Root onclick={focusEditor} class={cn("field-well overflow-hidden p-0", footer && "flex-col items-stretch")} data-floating-field
  data-field-focus="within" data-compound-field={!!prefix} data-filled={filled} data-label-raised={raised}>
  <div data-field-row class="flex w-full min-w-0 items-center">
    <FieldLabel for={id} {label} {labelVisibility} {required}>{@render children()}</FieldLabel>
    {#if prefix}<Group.Addon align="inline-start" class="field-prefix">{@render prefix()}</Group.Addon>{/if}
    {@render accessory()}
  </div>
  {@render footer?.()}
</Group.Root>
