<script lang="ts">
  import type { Snippet } from "svelte";
  import * as Group from "../vendor/components/ui/input-group/index.js";
  import FieldWellContent from "./FieldWellContent.svelte";
  import { cn } from "../vendor/utils.js";
  let { id, label, filled, required = false, prefix, accessory, footer, children, presentation = "standard" }: {
    id: string; label: string; filled: boolean; required?: boolean;
    prefix?: Snippet; accessory?: Snippet; footer?: Snippet | undefined; children: Snippet;
    presentation?: "standard" | "access";
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
<Group.Root {presentation} onclick={focusEditor} class={cn("field-well overflow-hidden p-0", footer && "flex-col items-stretch")} data-floating-field data-field-focus="within" data-compound-field={!!prefix} data-filled={filled}>
  <div data-field-row class="flex w-full min-w-0 items-center">
    <FieldWellContent {id} {label} {required} {children} />
    {#if prefix}<Group.Addon align="inline-start" class="field-prefix">{@render prefix()}</Group.Addon>{/if}
    {@render accessory?.()}
  </div>
  {@render footer?.()}
</Group.Root>
