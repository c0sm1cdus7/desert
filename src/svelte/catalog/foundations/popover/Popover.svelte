<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { Action } from "../../index.ts";
  import { Modal } from "../../index.ts";
  import type { Disclosure } from "../../../infra/disclosure.ts";
  import { dismissWhenInactive } from "../../../infra/surface-activity.svelte.ts";
  import { useSurfaceTypography } from "../../../infra/surface-typography.svelte.ts";
  import { provideSheetFocus } from "../../mechanisms/surface-focus/focus-return.ts";
  import { PickerPresentation, pickerBudget, calendarBudget } from "./picker-presentation.svelte.ts";
  import PopoverSurface from "./PopoverSurface.svelte";
  import FieldTrigger from "./FieldTrigger.svelte";
  let { label, open, disabled, locked, trigger, content, placement, align, onopenchange, children }: CatalogProps<"popover"> = $props();
  const id = $props.id(), triggerId = `${id}-trigger`, panelId = `${id}-surface`;
  const density = useSurfaceTypography();
  const calendar = $derived(trigger.kind === "field" && trigger.measure === "date");
  const picker = new PickerPresentation(() => calendar ? calendarBudget : pickerBudget);
  const sheet = $derived(placement === "adaptive" && picker.current === "sheet");
  const disclosure: Disclosure = $derived({ id: triggerId, controls: panelId, expanded: open,
    haspopup: content === "list" ? "listbox" : "dialog" });
  /** The person asks to open or close; a disabled popover refuses both, a locked one refuses closing. */
  function change(next: boolean) { if (!disabled && next !== open && (next || !locked)) onopenchange?.(next); }
  provideSheetFocus({ returnTo: () => document.getElementById(triggerId) });
  dismissWhenInactive(() => { if (open) onopenchange?.(false); });
  $effect(() => { if (disabled && open) onopenchange?.(false); });
</script>
{#if trigger.kind === "action"}
  <!-- F1-merge: <Action … disclosure={disclosure} onclick> replaces elementProps (lane F1b). -->
  <Action label={trigger.label} icon={trigger.icon} face={trigger.face} emphasis={trigger.emphasis}
    state={disabled ? "unavailable" : trigger.state} onclick={() => change(!open)}
    elementProps={{ id: disclosure.id, "aria-expanded": disclosure.expanded, "aria-haspopup": disclosure.haspopup,
      "aria-controls": open ? disclosure.controls : undefined, "data-state": open ? "open" : "closed" }} />
{:else}
  <FieldTrigger label={trigger.label} required={trigger.required} invalid={trigger.invalid} {disabled} display={trigger.display}
    measure={trigger.measure} {disclosure} onopen={() => change(!open)} />
{/if}
{#if sheet}
  <Modal {label} {open} {locked} presentation="sheet" ondismiss={() => change(false)}>{@render children?.()}</Modal>
{:else}
  <PopoverSurface {label} {open} {locked} {content} {align} {triggerId} {panelId} {calendar}
    density={density()} {change} {children} />
{/if}
