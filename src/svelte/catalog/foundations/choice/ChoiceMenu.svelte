<script lang="ts">
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  import { tick } from "svelte";
  import { Popover } from "../../index.ts";
  import { cn } from "../../../vendor/utils.js";
  import { pressFeedbackProps } from "../../mechanisms/press-feedback/press-feedback.ts";
  import { Field, Icon } from "../../index.ts";
  import { surfaceFocus, revealSurfaceFocus } from "../../mechanisms/surface-focus/surface-focus.svelte.ts";
  import { provideOpenFocus } from "../../mechanisms/surface-focus/focus-return.ts";
  import type { ChoiceOption } from "../../../../interaction/choice.ts";
  import ChoiceLeading from "./ChoiceLeading.svelte";
  import ChoiceMenuList from "./ChoiceMenuList.svelte";
  // One value from a list behind a trigger: a field well, an inline value (a currency beside an amount) or a contextual
  // value at a row's end. The popover anchors the list, or presents it as a sheet when its anchor has no room; the
  // trigger is an owned trigger of the popover: the well is Field's select trigger (the chosen option drawn here), the
  // inline and contextual values are this choice's own buttons.
  // A `measure` boxes the well at the choice measure of the field family (Field's measure: 26rem, filling a slot within
  // 3rem of it), so a select control keeps the width every field of its form keeps.
  let { id, label, trigger, placeholder, measure, options, selected, disabled, required, onchange }: { id: string; label: string;
    trigger: "well" | "inline" | "contextual"; placeholder: string | undefined; measure: "choice" | undefined;
    options: readonly ChoiceOption[]; selected: readonly string[];
    disabled: boolean; required: boolean; onchange: ((selected: string[]) => void) | undefined } = $props();
  let value = $derived(selected[0] ?? null);
  let chosen = $derived(options.find(option => option.value === value));
  let valueLabel = $derived(chosen?.label ?? placeholder ?? say(m.choice.notSelected));
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
  // The values keep the look the selection values had: an interior value at its fit width. The inline value fills the
  // height of the field prefix it sits in (a currency beside an amount).
  const base = "inline-flex shrink-0 items-center whitespace-nowrap type-control outline-none disabled:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0";
  const faces = {
    inline: "bg-transparent text-foreground border-0 w-full font-normal min-h-11 px-4 py-2 material-interior control-feedback",
    contextual: "bg-transparent text-foreground border-0 w-full font-normal min-h-11 px-4 py-2 material-interior control-feedback justify-self-end",
  } as const;
  const fit = "max-w-full min-w-0 whitespace-normal text-balance h-auto w-fit justify-between gap-3 rounded-[var(--radius-control)]";
  let name = $derived(trigger === "inline" ? `${valueLabel} · ${label}` : label);
</script>

{#snippet shown()}
  <span class="value" data-contextual={trigger === "contextual" || undefined}>
    {#if chosen?.leading}<ChoiceLeading leading={chosen.leading} frame="mark" />{/if}<span class="text wrap-words">{valueLabel}</span>
  </span>
{/snippet}
{#if trigger === "well"}
  <Field primitive="trigger" select label={label} labelVisibility="visible" {required} invalid={false} {disabled} {measure}
    display={{ kind: "text", text: valueLabel, placeholder: chosen === undefined }}
    disclosure={{ id, controls: `${id}-options`, expanded: open, haspopup: "listbox" }} onopen={() => { if (!disabled) open = !open; }}>
    {#snippet selection()}{@render shown()}{/snippet}
  </Field>
{:else}
<button {...pressFeedbackProps} type="button" {id} {disabled} class={cn(base, faces[trigger], fit, trigger === "inline" && "h-full")}
  aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? `${id}-options` : undefined} aria-label={name}
  aria-describedby={required ? `${id}-requirement` : undefined} data-state={open ? "open" : "closed"} data-selection-trigger data-choice="menu"
  onclick={() => { if (!disabled) open = !open; }}
  onkeydown={event => { if ((event.key === "ArrowDown" || event.key === "ArrowUp") && !disabled) { event.preventDefault(); open = true; } }}>
  <span class="content control-feedback-content disabled-content" data-button-content>{@render shown()}<Icon name="chevron-down" placement="inline-end" chevron decorative /></span>
</button>
{/if}
<Popover {label} {open} {disabled} locked={false} content="list" placement="adaptive" align="start" controls={`${id}-options`} onopenchange={next => { open = next; }}
  trigger={{ kind: "owned", id }}>
  <ChoiceMenuList id={`${id}-options`} {label} {value} {options} {required} bind:activeValue bind:ref={list} onchange={change}
    onclose={() => { open = false; }} />
</Popover>{#if required && trigger !== "well"}<span id={`${id}-requirement`} class="sr-only">{say(m.choice.required)}</span>{/if}

<style>
  .value { display:flex; flex:1; min-width:0; align-items:center; gap:.5rem; }
  .value[data-contextual] { justify-content:flex-end; text-align:end; }
  .text { min-width:0; white-space:normal; text-wrap:balance; }
  /* The trigger lays out its own content (it is not the vendor button, whose global rule did this): one row as the button. */
  .content { position:relative; display:flex; width:100%; min-width:0; flex-direction:inherit; align-items:inherit; justify-content:inherit; gap:inherit; }
</style>
