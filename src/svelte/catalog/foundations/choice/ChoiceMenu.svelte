<script lang="ts">
  import { tick, untrack } from "svelte";
  // F1-merge: the popover foundation (F1d) and the field trigger (F1b) replace the vendor popover, the vendor button,
  // FieldWellContent, PickerSheet and the infra focus helpers below: today's selection-field internals.
  import * as Popover from "../../../vendor/components/ui/popover/index.js";
  import { Button } from "../../../vendor/components/ui/button/index.js";
  import { FieldWellContent, Icon, PickerSheet } from "../../index.ts";
  import { dismissWhenInactive } from "../../../infra/surface-activity.svelte.ts";
  import { surfaceFocus, revealSurfaceFocus } from "../../../infra/surface-focus.svelte.ts";
  import { PickerPresentation } from "../../../infra/picker-presentation.svelte.ts";
  import type { ChoiceOption } from "../../../../interaction/choice.ts";
  import ChoiceLeading from "./ChoiceLeading.svelte";
  import ChoiceMenuList from "./ChoiceMenuList.svelte";
  // One value from a list behind a trigger: a field well, an inline value (a currency beside an amount) or a contextual
  // value at a row's end. A popover anchors the list; a narrow surface presents it as a bottom sheet.
  let { id, label, trigger, placeholder, options, selected, disabled, required, onchange }: { id: string; label: string;
    trigger: "well" | "inline" | "contextual"; placeholder: string | undefined; options: readonly ChoiceOption[]; selected: readonly string[];
    disabled: boolean; required: boolean; onchange: ((selected: string[]) => void) | undefined } = $props();
  const picker = new PickerPresentation();
  let value = $derived(selected[0] ?? null);
  let chosen = $derived(options.find(option => option.value === value));
  let valueLabel = $derived(chosen?.label ?? placeholder ?? "Not selected");
  let name = $derived(trigger === "well" ? `${label} · ${valueLabel}` : trigger === "inline" ? `${valueLabel} · ${label}` : label);
  let open = $state(false), activeValue = $state<string | null>(null), list = $state<HTMLDivElement | null>(null);
  let focusBoundary: HTMLElement | null = null;
  const boundary = () => list?.closest<HTMLElement>('[data-picker-sheet],[data-slot="popover-content"]') ?? null;
  const initialFocus = surfaceFocus(boundary);
  function focus(event: Event) {
    void tick().then(() => { focusBoundary = boundary() ?? focusBoundary; });
    const retained = activeValue;
    if (!retained) { initialFocus(event); return; }
    event.preventDefault();
    void tick().then(() => {
      const target = [...list?.querySelectorAll<HTMLElement>('[role="option"]') ?? []]
        .find(option => option.dataset.choiceOption === retained && option.getAttribute("aria-disabled") !== "true");
      const surface = boundary();
      if (!open || !surface) return;
      if (!target) { initialFocus(event); return; }
      target.focus({ preventScroll: true }); revealSurfaceFocus(target, surface);
    });
  }
  function restore(event: Event) {
    event.preventDefault();
    const active = document.activeElement;
    if (!open && (!active || active === document.body || focusBoundary?.contains(active))) document.getElementById(id)?.focus({ preventScroll: true });
  }
  $effect(() => { if (!open) activeValue = null; });
  dismissWhenInactive(() => { open = false; });
  $effect(() => { if (disabled) untrack(() => { open = false; }); });
  function change(next: string) {
    if (!disabled && next !== value && options.some(option => option.value === next && !option.disabled)) onchange?.([next]);
  }
</script>

{#snippet shown()}
  <span class="value" data-contextual={trigger === "contextual" || undefined}>
    {#if chosen?.leading}<ChoiceLeading leading={chosen.leading} frame="mark" />{/if}<span class="text">{valueLabel}</span>
  </span>
{/snippet}
{#snippet choices()}
  <ChoiceMenuList id={`${id}-options`} {label} {value} {options} {required} bind:activeValue bind:ref={list} onchange={change}
    onclose={() => { open = false; }} />
{/snippet}
<Popover.Root bind:open>
  <Popover.Trigger {id} {disabled}>
    {#snippet child({ props })}
      <Button {...props} {disabled} wrap variant={trigger === "well" ? "well" : "field"} size={trigger === "well" ? "well" : "default"}
        data-floating-field={trigger === "well" || undefined} data-filled={trigger === "well" || undefined}
        presentation={trigger === "well" ? "selection-well" : trigger === "contextual" ? "selection-context" : "selection-inline"}
        aria-haspopup="listbox" aria-controls={open ? `${id}-options` : undefined} aria-label={name}
        aria-describedby={required ? `${id}-requirement` : undefined} data-selection-trigger data-choice="menu"
        onkeydown={event => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); open = true; }
          else if (typeof props.onkeydown === "function") props.onkeydown(event);
        }}>
        {#if trigger === "well"}
          <FieldWellContent {label} {required}>
            <span data-field-value class="flex min-w-0 items-center justify-between gap-3">
              {@render shown()}<Icon name="chevron-down" placement="inline-end" chevron decorative />
            </span>
          </FieldWellContent>
        {:else}{@render shown()}<Icon name="chevron-down" placement="inline-end" chevron decorative />{/if}
      </Button>
    {/snippet}
  </Popover.Trigger>
  {#if picker.current === "sheet"}
    <PickerSheet bind:open {label} triggerId={id} onOpenAutoFocus={focus}>{@render choices()}</PickerSheet>
  {:else}
    <Popover.Content role="presentation" onOpenAutoFocus={focus} onCloseAutoFocus={restore} presentation="selection"
      onFocusOutside={event => { if (!(event.target instanceof HTMLElement) || event.target.id !== id) open = false; }}>
      {@render choices()}
    </Popover.Content>
  {/if}
</Popover.Root>
{#if required}<span id={`${id}-requirement`} class="sr-only">Required</span>{/if}

<style>
  .value { display:flex; flex:1; min-width:0; align-items:center; gap:.5rem; }
  .value[data-contextual] { justify-content:flex-end; text-align:end; }
  .text { min-width:0; white-space:normal; overflow-wrap:anywhere; text-wrap:balance; }
</style>
