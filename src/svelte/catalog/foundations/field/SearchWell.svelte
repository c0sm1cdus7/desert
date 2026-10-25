<script lang="ts">
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  // The well of a search Field: a leading search glyph, the query editor and its clear control. A press on the well's
  // own surface focuses the editor; `focus: "on-mount"` focuses it when the well appears (an expanding toolbar search).
  import * as Group from "../../../vendor/components/ui/input-group/index.js";
  import { Icon } from "../../index.ts";
  import ClearInput from "./ClearInput.svelte";
  let { id, label, placeholder, disabled, invalid, describedBy, focus, writing = $bindable(""), onchange }: {
    id: string; label: string; placeholder: string | undefined; disabled: boolean; invalid: boolean; describedBy: string | undefined;
    focus: "on-mount" | undefined; writing?: string; onchange: (value: string) => void;
  } = $props();
  let editor = $state<HTMLInputElement | null>(null);
  $effect(() => { if (focus === "on-mount" && editor) editor.focus({ preventScroll: true }); });
  function focusEditor(event: MouseEvent) {
    if (!(event.target instanceof Element) || event.target.closest("button,input")) return;
    editor?.focus({ preventScroll: true });
  }
</script>
<Group.Root data-search-field data-disabled={disabled} aria-disabled={disabled || undefined} onclick={focusEditor}>
  <Group.Input {id} bind:ref={editor} type="search" bind:value={writing} {disabled} {placeholder} aria-label={label}
    aria-invalid={invalid} aria-describedby={describedBy} autocomplete="off" oninput={event => onchange(event.currentTarget.value)} />
  <Group.Addon align="inline-start"><Icon name="search" search="leading" decorative /></Group.Addon>
  <ClearInput control={id} value={writing} label={say(m.field.clearSearch)} {disabled} />
</Group.Root>
