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
  // inline and contextual values are triggers this choice draws itself.
  let { id, label, trigger, placeholder, options, selected, disabled, required, onchange }: { id: string; label: string;
    trigger: "well" | "inline" | "contextual"; placeholder: string | undefined; options: readonly ChoiceOption[]; selected: readonly string[];
    disabled: boolean; required: boolean; onchange: ((selected: string[]) => void) | undefined } = $props();
  let value = $derived(selected[0] ?? null);
  let chosen = $derived(options.find(option => option.value === value));
  let valueLabel = $derived(chosen?.label ?? placeholder ?? "Not selected");
  let name = $derived(trigger === "inline" ? `${valueLabel} · ${label}` : label);
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
  /** The inline and contextual values keep the field-variant look the selection well had (interior, value at the end). */
  const valueTrigger = cn("inline-flex shrink-0 items-center whitespace-nowrap type-control outline-none disabled:pointer-events-none",
    "[&_svg]:size-4 [&_svg]:shrink-0 bg-transparent text-foreground border-0 font-normal min-h-11 px-4 py-2 material-interior control-feedback",
    "max-w-full min-w-0 whitespace-normal text-balance h-auto w-fit justify-between gap-3 rounded-[var(--radius)]");
</script>

{#if trigger !== "well"}
  <button {...pressFeedbackProps} type="button" {id} {disabled} class={cn(valueTrigger, trigger === "contextual" && "justify-self-end")}
    aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? `${id}-options` : undefined} aria-label={name}
    aria-describedby={required ? `${id}-requirement` : undefined} data-state={open ? "open" : "closed"} data-selection-trigger data-choice="menu"
    onclick={() => { if (!disabled) open = !open; }}
    onkeydown={event => { if ((event.key === "ArrowDown" || event.key === "ArrowUp") && !disabled) { event.preventDefault(); open = true; } }}>
    <span class="control-feedback-content" data-button-content>
      <span class="value" data-contextual={trigger === "contextual" || undefined}>
        {#if chosen?.leading}<ChoiceLeading leading={chosen.leading} frame="mark" />{/if}<span class="text">{valueLabel}</span>
      </span>
      <Icon name="chevron-down" placement="inline-end" chevron decorative />
    </span>
  </button>
{/if}
<Popover {label} {open} {disabled} locked={false} content="list" placement="adaptive" align="start" controls={`${id}-options`} onopenchange={next => { open = next; }}
  trigger={trigger === "well" ? { kind: "field", label, required, invalid: false, measure: "choice",
    display: { kind: "text", text: valueLabel, placeholder: chosen === undefined } } : { kind: "owned", id }}>
  <ChoiceMenuList id={`${id}-options`} {label} {value} {options} {required} bind:activeValue bind:ref={list} onchange={change}
    onclose={() => { open = false; }} />
</Popover>
{#if required && trigger !== "well"}<span id={`${id}-requirement`} class="sr-only">Required</span>{/if}

<style>
  .value { display:flex; flex:1; min-width:0; align-items:center; gap:.5rem; }
  .value[data-contextual] { justify-content:flex-end; text-align:end; }
  .text { min-width:0; white-space:normal; overflow-wrap:anywhere; text-wrap:balance; }
</style>
