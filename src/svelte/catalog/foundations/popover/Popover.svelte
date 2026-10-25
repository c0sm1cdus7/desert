<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { Action } from "../../index.ts";
  import { Field } from "../../index.ts";
  import { Modal } from "../../index.ts";
  import type { Disclosure } from "../../../infra/disclosure.ts";
  import { dismissWhenInactive } from "../../../infra/surface-activity.svelte.ts";
  import { useSurfaceDensityClass } from "../../../infra/surface-typography.svelte.ts";
  import { provideSheetFocus, takeOpenFocus } from "../../mechanisms/surface-focus/focus-return.ts";
  import { PickerPresentation, pickerBudget, calendarBudget } from "./picker-presentation.svelte.ts";
  import PopoverSurface from "./PopoverSurface.svelte";
  let { label, open, disabled, locked, trigger, content, placement, align, controls, onopenchange, children }: CatalogProps<"popover"> = $props();
  const id = $props.id(), panelId = `${id}-surface`;
  const triggerId = $derived(trigger.kind === "owned" ? trigger.id : `${id}-trigger`);
  const density = useSurfaceDensityClass();
  const calendar = $derived(trigger.kind === "field" && trigger.measure === "date");
  const picker = new PickerPresentation(() => calendar ? calendarBudget : pickerBudget);
  const sheet = $derived(placement === "adaptive" && picker.current === "sheet");
  const disclosure: Disclosure = $derived({ id: triggerId, controls: controls ?? panelId, expanded: open,
    haspopup: content === "list" ? "listbox" : "dialog" });
  /** The person asks to open or close; a disabled popover refuses both, a locked one refuses closing. */
  function change(next: boolean) { if (!disabled && next !== open && (next || !locked)) onopenchange?.(next); }
  const openFocus = takeOpenFocus();
  provideSheetFocus({ returnTo: () => document.getElementById(triggerId), open: openFocus });
  dismissWhenInactive(() => { if (open) onopenchange?.(false); });
  $effect(() => { if (disabled && open) onopenchange?.(false); });
</script>
{#if trigger.kind === "action"}
  <Action label={trigger.label} icon={trigger.icon} face={trigger.face} emphasis={trigger.emphasis} type="button"
    state={disabled ? "unavailable" : trigger.state} bar={trigger.bar} {disclosure} onclick={() => change(!open)} />
{:else if trigger.kind === "field"}
  <Field primitive="trigger" label={trigger.label} labelVisibility="visible" required={trigger.required} invalid={trigger.invalid}
    {disabled} measure={trigger.measure} display={trigger.display} {disclosure} onopen={() => change(!open)} />
{/if}
{#if sheet}
  <!-- In a sheet a list keeps the picker inset of its rows; a calendar frames its own header. -->
  <Modal {label} {open} {locked} presentation="sheet" ondismiss={() => change(false)}>
    {#if content === "list"}<div class="picker-content-inset pt-2 pb-4">{@render children?.()}</div>{:else}{@render children?.()}{/if}
  </Modal>
{:else}
  <PopoverSurface {label} {open} {locked} {content} {align} {triggerId} {panelId} {calendar} {openFocus}
    density={density()} {change} {children} />
{/if}
