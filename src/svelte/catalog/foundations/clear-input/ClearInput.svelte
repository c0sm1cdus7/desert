<script lang="ts">
  import * as Group from "../../../vendor/components/ui/input-group/index.js";
  import CircleX from "@lucide/svelte/icons/circle-x";
  let { control, value, label, disabled = false }: {
    control: string; value: string; label: string; disabled?: boolean;
  } = $props();

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

{#if value.length > 0}
  <Group.Addon align="inline-end" class="field-clear shrink-0">
    <Group.Button size="icon-sm" class="min-h-0" type="button" data-input-clear aria-label={label} title={label}
      aria-controls={control} {disabled} onclick={clear}><CircleX aria-hidden="true" /></Group.Button>
  </Group.Addon>
{/if}
