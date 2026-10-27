<script lang="ts">
  import { untrack } from "svelte";
  import { Button } from "../../../vendor/components/ui/button/index.js";
  import { cn } from "../../../vendor/utils.js";
  import { actionIconNames } from "../../../infra/action-icons.ts";
  import { Icon } from "../../index.ts";
  import { inFieldAccessory } from "../../mechanisms/field-accessory/field-accessory.svelte.ts";
  import { actionPairScale } from "../../mechanisms/action-pair/action-pair.svelte.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { label, icon, state: status, emphasis, face: shown, type, reason, form, disclosure, current, bar, onclick }: CatalogProps<"action"> = $props();
  const id = $props.id();
  const descriptionId = `${id}-reason`;
  const variants = { primary: "default", secondary: "secondary", destructive: "destructive" } as const;
  // In a field's trailing accessory (law 9d) the icon action fills the slot's inset box with the concentric radius.
  const accessory = inFieldAccessory();
  let button = $state<HTMLButtonElement | null>(null);
  let caption = $state<HTMLSpanElement | null>(null);
  let compact = $state(false);
  // Only the `fit` face measures: it shows the icon once the label no longer fits. `text` keeps its label, `icon` its glyph.
  let face = $derived(status === "pending" ? "pending" : shown === "icon" || shown === "fit" && compact ? "icon" : "label");
  $effect(() => {
    label;
    if (shown !== "fit" || !button || !caption) { compact = false; return; }
    const element = button, text = caption;
    const measure = () => { compact = text.scrollWidth > text.clientWidth + 1; };
    const observer = new ResizeObserver(measure);
    observer.observe(element); observer.observe(text); measure();
    document.fonts.addEventListener("loadingdone", measure);
    return () => { observer.disconnect(); document.fonts.removeEventListener("loadingdone", measure); };
  });
  // A `text` label wraps between words; a word wider than the whole line (a half of the bottom pair on a narrow phone at
  // large text: English never hyphenates a capitalised word) sets the label smaller, just enough for that word to fit
  // whole, as a platform button shrinks its title, never below half its size; past that, typography's last resort breaks it.
  let scale = $state(1);
  const drawn = actionPairScale(id, () => scale, () => bar === "step");
  $effect(() => {
    label;
    if (shown !== "text" || !button || !caption?.parentElement) { scale = 1; return; }
    const element = button, text = caption, line = caption.parentElement, context = document.createElement("canvas").getContext("2d");
    const measure = () => {
      const style = getComputedStyle(element), words = label.split(/\s+/).filter(Boolean);
      if (!context || !words.length) return;
      // The room is read with the label at its full size (a smaller label narrows a button that fits its label, which
      // must not shrink it further), then the drawn size is put back in the same task, before any paint. Through the
      // style object, not the attribute: a page whose content policy forbids inline style attributes still allows it.
      const drawnStyle = text.style.cssText;
      text.style.cssText = "";
      const room = line.getBoundingClientRect().width, base = parseFloat(style.fontSize);
      if (drawnStyle) text.style.cssText = drawnStyle; else text.removeAttribute("style");
      // A platform font draws a smaller size with wider letters (its text optical size), so each step measures again.
      const widest = (factor: number) => {
        context.font = `${style.fontStyle} ${style.fontWeight} ${base * factor}px ${style.fontFamily}`;
        return Math.max(...words.map(word => context.measureText(word).width));
      };
      // A label that fits its button (a word as wide as the line it sizes) is measured to within a pixel of its line.
      let next = 1;
      if (widest(1) > room + 1)
        for (let step = 0; step < 4 && next > .5 && widest(next) > room - 1; step++) next = Math.max(.5, next * (room - 1) / widest(next) - .005);
      if (Math.abs(next - untrack(() => scale)) > .005) scale = next;
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element); measure();
    document.fonts.addEventListener("loadingdone", measure);
    return () => { observer.disconnect(); document.fonts.removeEventListener("loadingdone", measure); };
  });
</script>
<!-- One disabled look: an unavailable action of any emphasis draws the neutral pane with its faded label, plainly not a
     ready primary (a pale label on the primary's tint read neither as disabled nor legibly). -->
<Button bind:ref={button} variant={status === "unavailable" ? "secondary" : variants[emphasis]} size={shown === "icon" ? "icon-lg" : "default"} spin={status === "pending"}
  {type} {form} id={disclosure?.id} aria-haspopup={disclosure?.haspopup} aria-expanded={disclosure?.expanded}
  aria-controls={disclosure?.expanded ? disclosure.controls : undefined}
  data-state={disclosure ? disclosure.expanded ? "open" : "closed" : undefined} aria-current={current || undefined}
  onclick={() => { if (status === "ready") onclick?.(); }} class="relative min-w-0 overflow-hidden {shown === 'icon' ? '' : 'w-fit max-w-[min(100%,22rem)]'} {bar === 'step' ? 'narrow-page:px-[8px]' : ''}"
  disabled={status !== "ready"} aria-busy={status === "pending"} aria-label={label} title={reason ?? (compact ? label : undefined)}
  aria-describedby={reason ? descriptionId : undefined}
  data-action="" data-action-face={face} data-emphasis={emphasis} data-action-bar={bar} data-action-accessory={accessory && shown === "icon" || undefined}>
  <!-- A label is never cut short. A `text` label wraps between words (typography's word policy) and the button grows
       taller, as a platform button does at large text; a narrow page steps a bottom-pair half's inline inset down to
       give its words room. A `fit` label keeps one line, which its measure reads, and shows the icon once it no longer
       fits. -->
  <span bind:this={caption} data-button-label aria-hidden="true"
    style={drawn.current < 1 ? `font-size:calc(${drawn.current} * var(--text-control));line-height:calc(${drawn.current} * var(--text-control--line-height))` : undefined}
    class={cn("min-w-0", shown === "text" ? "overflow-hidden whitespace-normal text-center wrap-words" : shown === "fit" ? "overflow-hidden whitespace-nowrap" : "truncate",
      face !== "label" && "invisible")}>{label}</span>
  <span class={cn("absolute inset-0 flex items-center justify-center", face === "label" && "invisible")}
    aria-hidden="true" data-button-glyph data-action-face={face}>
    <Icon name={status === "pending" ? "loader-circle" : actionIconNames[icon]} placement="inline-start" decorative />
  </span>
</Button>
{#if reason}<span id={descriptionId} class="sr-only">{reason}</span>{/if}
