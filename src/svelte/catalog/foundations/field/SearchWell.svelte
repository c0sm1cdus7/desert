<script lang="ts">
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  // The well of a search Field: a leading search glyph, the query editor and its clear control. A press on the well's
  // own surface focuses the editor; `focus: "on-mount"` focuses it when the well appears (an expanding toolbar search).
  // A bar's search gives its clear control the bar's target; in a comfortable layout (a workspace whose navigation is an
  // overlay) the well keeps the touch geometry it has on a narrow or coarse screen.
  import * as Group from "../../../vendor/components/ui/input-group/index.js";
  import { Icon } from "../../index.ts";
  import { useSurfaceTypography } from "../../../infra/surface-typography.svelte.ts";
  import ClearInput from "./ClearInput.svelte";
  let { id, label, placeholder, disabled, invalid, describedBy, focus, controls, bar, writing = $bindable(""), onchange }: {
    id: string; label: string; placeholder: string | undefined; disabled: boolean; invalid: boolean; describedBy: string | undefined;
    focus: "on-mount" | undefined; controls: string | undefined; bar: "search" | undefined; writing?: string; onchange: (value: string) => void;
  } = $props();
  const density = useSurfaceTypography();
  let editor = $state<HTMLInputElement | null>(null);
  $effect(() => { if (focus === "on-mount" && editor) editor.focus({ preventScroll: true }); });
  function focusEditor(event: MouseEvent) {
    if (!(event.target instanceof Element) || event.target.closest("button,input")) return;
    editor?.focus({ preventScroll: true });
  }
</script>
<Group.Root data-search-field data-disabled={disabled} aria-disabled={disabled || undefined} onclick={focusEditor}
  data-bar-search={bar === "search" || undefined} data-comfortable={density() === "comfortable" || undefined}>
  <Group.Input {id} bind:ref={editor} type="search" bind:value={writing} {disabled} {placeholder} aria-label={label}
    aria-invalid={invalid} aria-describedby={describedBy} aria-controls={controls} autocomplete="off" oninput={event => onchange(event.currentTarget.value)} />
  <Group.Addon align="inline-start"><Icon name="search" search="leading" size="lead" decorative /></Group.Addon>
  <ClearInput control={id} value={writing} label={say(m.field.clearSearch)} {disabled} lead />
</Group.Root>
