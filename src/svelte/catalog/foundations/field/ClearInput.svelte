<script lang="ts">
  import * as Group from "../../../vendor/components/ui/input-group/index.js";
  import { Icon } from "../../index.ts";
  // The trailing button of a Field that empties its control through the editor's own edit pipeline (masks and undo
  // included); it renders nothing while the control is empty or disabled (a disabled field offers no edit).
  // In a search well its glyph leads the line as the well's search glyph does (Icon's `lead` size).
  let { control, value, label, disabled, lead = false }: { control: string; value: string; label: string; disabled: boolean; lead?: boolean } = $props();

  function clear() {
    const input = document.getElementById(control);
    if (disabled || !(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) || input.disabled || input.readOnly) return;
    input.focus({ preventScroll: true });
    // Use the editor's ordinary edit pipeline, including masks and their history.
    // Clear replaces the entire value, regardless of the user's current selection.
    const selection = [input.selectionStart, input.selectionEnd, input.selectionDirection] as const;
    input.select();
    const options = { bubbles: true, inputType: "insertReplacementText", data: "" };
    if (!input.dispatchEvent(new InputEvent("beforeinput", { ...options, cancelable: true }))) {
      input.setSelectionRange(selection[0], selection[1], selection[2] ?? undefined);
      return;
    }
    // Native replacement preserves plain-text undo; masks own their formatted history.
    if (!input.hasAttribute("data-input-mask")) {
      let notified = false;
      const observe = () => { notified = true; };
      input.addEventListener("input", observe, { once: true });
      let edited = false;
      try { edited = document.execCommand?.("delete") ?? false; }
      finally { input.removeEventListener("input", observe); }
      if (edited) {
        if (!notified) input.dispatchEvent(new InputEvent("input", options));
        return;
      }
    }
    input.value = "";
    input.dispatchEvent(new InputEvent("input", options));
  }
</script>

{#if value.length > 0 && !disabled}
  <Group.Addon align="inline-end" class="field-clear shrink-0">
    <Group.Button size="icon-sm" class="min-h-0" type="button" data-input-clear aria-label={label} title={label}
      aria-controls={control} {disabled} onclick={clear}><Icon name="circle-x" size={lead ? "lead" : undefined} decorative /></Group.Button>
  </Group.Addon>
{/if}
