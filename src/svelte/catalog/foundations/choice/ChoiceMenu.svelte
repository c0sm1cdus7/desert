<script lang="ts">
  import { tick } from "svelte";
  import { Popover } from "../../index.ts";
  import { cn } from "../../../vendor/utils.js";
  // F1-merge: press feedback — the button family's pressFeedback attachment until its owner is settled (as Tag, Avatar).
  import { pressFeedbackProps } from "../../../vendor/components/ui/button/press-feedback.js";
  import { Icon } from "../../index.ts";
  import { surfaceFocus, revealSurfaceFocus } from "../../mechanisms/surface-focus/surface-focus.svelte.ts";
  import { provideOpenFocus } from "../../mechanisms/surface-focus/focus-return.ts";
  import type { ChoiceOption } from "../../../../interaction/choice.ts";
  import ChoiceLeading from "./ChoiceLeading.svelte";
  import ChoiceMenuList from "./ChoiceMenuList.svelte";
  // One value from a list behind a trigger: a field well, an inline value (a currency beside an amount) or a contextual
  // value at a row's end. The popover anchors the list, or presents it as a sheet when its anchor has no room; the
  // trigger is this choice's own (an owned trigger of the popover).
  // A `measure` boxes the trigger at the choice measure of the field family (field-measure.css: 26rem, filling a slot
  // within 3rem of it), so a select control keeps the width every field of its form keeps.
  let { id, label, trigger, placeholder, measure, options, selected, disabled, required, onchange }: { id: string; label: string;
    trigger: "well" | "inline" | "contextual"; placeholder: string | undefined; measure: "choice" | undefined;
    options: readonly ChoiceOption[]; selected: readonly string[];
    disabled: boolean; required: boolean; onchange: ((selected: string[]) => void) | undefined } = $props();
  let value = $derived(selected[0] ?? null);
  let chosen = $derived(options.find(option => option.value === value));
  let valueLabel = $derived(chosen?.label ?? placeholder ?? "Not selected");
  let open = $state(false), activeValue = $state<string | null>(null), list = $state<HTMLDivElement | null>(null);
  const boundary = () => list?.closest<HTMLElement>('[data-picker-sheet],[data-slot="popover-content"]') ?? null;
  const initialFocus = surfaceFocus(boundary);
  /** Opening, or a presentation replacement while open, returns to the option the person was exploring. */
  function focus(event: Event) {
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
  provideOpenFocus(focus);
  $effect(() => { if (!open) activeValue = null; });
  function change(next: string) {
    if (!disabled && next !== value && options.some(option => option.value === next && !option.disabled)) onchange?.([next]);
  }
  // The triggers keep the look the selection well and values had: a fit-width well (a pane) or an interior value.
  // F1-merge: Field's trigger primitive draws the well once it offers this fit width and the chosen option's leading.
  const base = "inline-flex shrink-0 items-center whitespace-nowrap type-control outline-none disabled:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0";
  const faces = {
    well: "text-foreground text-left whitespace-normal w-full font-normal p-0 material-pane control-feedback field-well overflow-hidden",
    inline: "bg-transparent text-foreground border-0 w-full font-normal min-h-11 px-4 py-2 material-interior control-feedback",
    contextual: "bg-transparent text-foreground border-0 w-full font-normal min-h-11 px-4 py-2 material-interior control-feedback justify-self-end",
  } as const;
  const fit = "max-w-full min-w-0 whitespace-normal text-balance h-auto w-fit justify-between gap-3 rounded-[var(--radius)]";
  let name = $derived(trigger === "well" ? `${label} · ${valueLabel}` : trigger === "inline" ? `${valueLabel} · ${label}` : label);
</script>

{#snippet shown()}
  <span class="value" data-contextual={trigger === "contextual" || undefined}>
    {#if chosen?.leading}<ChoiceLeading leading={chosen.leading} frame="mark" />{/if}<span class="text">{valueLabel}</span>
  </span>
{/snippet}
{#snippet menu()}
<button {...pressFeedbackProps} type="button" {id} {disabled} class={cn(base, faces[trigger], fit)}
  data-floating-field={trigger === "well" || undefined} data-filled={trigger === "well" || undefined}
  aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? `${id}-options` : undefined} aria-label={name}
  aria-describedby={required ? `${id}-requirement` : undefined} data-state={open ? "open" : "closed"} data-selection-trigger data-choice="menu"
  onclick={() => { if (!disabled) open = !open; }}
  onkeydown={event => { if ((event.key === "ArrowDown" || event.key === "ArrowUp") && !disabled) { event.preventDefault(); open = true; } }}>
  <span class="content control-feedback-content disabled-content" data-button-content>
    {#if trigger === "well"}
      <!-- lane-merge: the well content FieldWellContent drew (deleted in Batch 3), until Field's trigger draws this well. -->
      <span class="relative flex min-w-0 flex-1 flex-col" data-field-well>
        <span data-slot="field-label">{label}{#if required}<span class="required" aria-hidden="true">*</span>{/if}</span>
        <span data-field-value class="flex min-w-0 items-center justify-between gap-3">
          {@render shown()}<Icon name="chevron-down" placement="inline-end" chevron decorative />
        </span>
      </span>
    {:else}{@render shown()}<Icon name="chevron-down" placement="inline-end" chevron decorative />{/if}
  </span>
</button>
<Popover {label} {open} {disabled} locked={false} content="list" placement="adaptive" align="start" controls={`${id}-options`} onopenchange={next => { open = next; }}
  trigger={{ kind: "owned", id }}>
  <ChoiceMenuList id={`${id}-options`} {label} {value} {options} {required} bind:activeValue bind:ref={list} onchange={change}
    onclose={() => { open = false; }} />
</Popover>{#if required}<span id={`${id}-requirement`} class="sr-only">Required</span>{/if}
{/snippet}
{#if measure}<div class="measure" data-choice-measure={measure}><div class="measure-box">{@render menu()}</div></div>{:else}{@render menu()}{/if}

<style>
  .value { display:flex; flex:1; min-width:0; align-items:center; gap:.5rem; }
  .value[data-contextual] { justify-content:flex-end; text-align:end; }
  .text { min-width:0; white-space:normal; overflow-wrap:anywhere; text-wrap:balance; }
  /* The trigger lays out its own content (it is not the vendor button, whose global rule did this): one row as the button. */
  .content { position:relative; display:flex; width:100%; min-width:0; flex-direction:inherit; align-items:inherit; justify-content:inherit; gap:inherit; }
  /* The choice measure of the field family (field-measure.css), measured on the containing slot, never the device. */
  .measure { container:choice-measure / inline-size; width:100%; min-width:0; align-self:stretch; }
  .measure-box { display:flex; flex-direction:column; width:100%; min-width:0; max-width:26rem; }
  @container choice-measure (max-width:29rem) { .measure-box { max-width:none; } }
  /* The required mark (from the theme): destructive ink beside its label. */
  .required { color:var(--destructive); }
</style>
