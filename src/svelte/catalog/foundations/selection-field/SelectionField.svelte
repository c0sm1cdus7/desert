<script lang="ts">
  import { tick, untrack, type Snippet } from "svelte";
  import { dismissWhenInactive } from '../../../infra/surface-activity.svelte.ts';
  import { useSurfaceDensityClass } from "../../../infra/surface-typography.svelte.ts";
  import * as Popover from "../../../vendor/components/ui/popover/index.js";
  import { Button } from "../../../vendor/components/ui/button/index.js";
  import { Icon } from "../../index.ts";
  import { FieldWellContent } from "../../index.ts";
  import { Face } from "../../index.ts";
  import { PickerSheet } from "../../index.ts";
  import SelectionList from "./SelectionList.svelte";
  import { surfaceFocus, revealSurfaceFocus } from "../../mechanisms/surface-focus/surface-focus.svelte.ts";
  // F1-merge: absorbed by Choice (which opens through Popover); its composition callers move to Choice (lane B) and this
  // folder, with its import of the popover part, goes in Batch 3.
  import { PickerPresentation, pickerBudget } from "../popover/picker-presentation.svelte.ts";
  import type { SelectionOption } from "../../../../interaction/selection-option.ts";
  let { id, selection, label, triggerLabel = label, value, options, disabled = false, required = false,
    fieldControl = false, contextual = false, selectedContent, optionLeading, onchange }: {
    id?: string; selection: string; label: string; triggerLabel?: string; value: string | null;
    options: readonly (SelectionOption & { readonly description?: string })[];
    disabled?: boolean; required?: boolean; fieldControl?: boolean; contextual?: boolean; onchange: (value: string) => void;
    selectedContent?: Snippet<[SelectionOption | undefined]>;
    optionLeading?: Snippet<[SelectionOption]>;
  } = $props();
  const generatedId = $props.id();
  const picker = new PickerPresentation(() => pickerBudget);
  let triggerId = $derived(id ?? generatedId);
  let selectedOption = $derived(options.find(option => option.value === value));
  let valueLabel = $derived(selectedOption?.label ?? "Not selected");
  let open = $state(false);
  let activeValue = $state<string | null>(null);
  let list = $state<HTMLDivElement | null>(null);
  let focusBoundary: HTMLElement | null = null;
  const boundary = () => list?.closest<HTMLElement>('[data-picker-sheet],[data-slot="popover-content"]') ?? null;
  const initialFocus = surfaceFocus(boundary);
  // The anchored surface owns its focus scope; focus moving anywhere but the trigger dismisses it.
  let selectionSurface = $state<HTMLElement | null>(null);
  const surface = surfaceFocus(() => selectionSurface, event => {
    if (!(event.target instanceof HTMLElement) || event.target.id !== triggerId) open = false;
  });
  const density = useSurfaceDensityClass();
  function focus(event: Event) {
    void tick().then(() => { focusBoundary = boundary() ?? focusBoundary; });
    const retained = activeValue;
    if (!retained) { initialFocus(event); return; }
    event.preventDefault();
    void tick().then(() => {
      const target = [...list?.querySelectorAll<HTMLElement>('[role="option"]') ?? []]
        .find(option => option.dataset.value === retained && option.getAttribute('aria-disabled') !== 'true');
      const surface = boundary();
      if (!open || !surface) return;
      if (!target) { initialFocus(event); return; }
      target.focus({ preventScroll: true }); revealSurfaceFocus(target, surface);
    });
  }
  function restore(event: Event) {
    event.preventDefault();
    const active = document.activeElement;
    if (!open && (!active || active === document.body || focusBoundary?.contains(active)))
      document.getElementById(triggerId)?.focus({ preventScroll: true });
  }
  $effect(() => { if (!open) activeValue = null; });
  dismissWhenInactive(() => { open = false; });
  let observed = untrack(() => selection);
  $effect(() => {
    const next = selection, unavailable = disabled;
    untrack(() => { if (unavailable || next !== observed) open = false; observed = next; });
  });
  function change(next: string) {
    if (!disabled && next !== value && options.some(option => option.value === next && !option.disabled)) onchange(next);
  }
</script>
{#snippet selectedValue()}
  {#if selectedContent}{@render selectedContent(selectedOption)}{:else}
  <span class="selection-value" data-contextual={contextual || undefined}>
    {#if selectedOption?.face}<Face face={selectedOption.face} compact />{/if}
    <span class="selection-label">{valueLabel}</span>
  </span>
  {/if}
{/snippet}
{#snippet choices()}
  <SelectionList {label} {value} {options} {optionLeading} {required} bind:activeValue bind:ref={list}
    onchange={change} onclose={() => { open = false; }} />
{/snippet}
<Popover.Root bind:open>
  <Popover.Trigger id={triggerId} {disabled}>
    {#snippet child({ props })}
    <Button {...props} {disabled} wrap variant={fieldControl ? 'well' : 'field'} size={fieldControl ? 'well' : 'default'}
      data-slot="select-trigger" data-floating-field={fieldControl || undefined} data-filled={fieldControl || undefined}
      presentation={fieldControl ? 'selection-well' : contextual ? 'selection-context' : 'selection-inline'}
      aria-haspopup="listbox" aria-controls={open ? list?.id : undefined}
      aria-label={fieldControl ? `${label} · ${valueLabel}` : triggerLabel}
      aria-describedby={required ? `${triggerId}-requirement` : undefined} data-selection-trigger
      onkeydown={event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); open = true; }
        else if (typeof props.onkeydown === 'function') props.onkeydown(event);
      }}>
    {#if fieldControl}
      <FieldWellContent {label} {required}>
        <span data-field-value class="flex min-w-0 items-center justify-between gap-3">
          {@render selectedValue()}
          <Icon name="chevron-down" placement="inline-end" chevron decorative />
        </span>
      </FieldWellContent>
    {:else}
      {@render selectedValue()}
      <Icon name="chevron-down" placement="inline-end" chevron decorative />
    {/if}
    </Button>
    {/snippet}
  </Popover.Trigger>
  {#if picker.current === "sheet"}
    <PickerSheet bind:open {label} {triggerId} onOpenAutoFocus={focus}>
      {@render choices()}
    </PickerSheet>
  {:else}
    <Popover.Content bind:ref={selectionSurface} role="presentation" class={density()} presentation="selection"
      onOpenAutoFocus={event => surface.open(event, focus)} onCloseAutoFocus={event => surface.close(event, restore)}>
      {@render choices()}
    </Popover.Content>
  {/if}
</Popover.Root>
{#if required}<span id={`${triggerId}-requirement`} class="sr-only">Required</span>{/if}
<style>
  .selection-value { display:flex; flex:1; min-width:0; align-items:center; gap:.5rem; }
  .selection-value[data-contextual] { justify-content:flex-end; text-align:end; }
  .selection-label { min-width:0; white-space:normal; overflow-wrap:anywhere; text-wrap:balance; }
</style>
