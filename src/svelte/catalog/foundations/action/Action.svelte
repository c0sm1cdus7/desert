<script lang="ts">
  import { Button } from "../../../vendor/components/ui/button/index.js";
  import { cn } from "../../../vendor/utils.js";
  import { actionIconNames } from "../../../infra/action-icons.ts";
  import { Icon } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { label, icon, state: status, emphasis, face: shown, type, reason, form, disclosure, current, onclick }: CatalogProps<"action"> = $props();
  const id = $props.id();
  const descriptionId = `${id}-reason`;
  const variants = { primary: "default", secondary: "secondary", destructive: "destructive" } as const;
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
</script>
<Button bind:ref={button} variant={variants[emphasis]} size={shown === "icon" ? "icon-lg" : "default"} spin={status === "pending"}
  {type} {form} id={disclosure?.id} aria-haspopup={disclosure?.haspopup} aria-expanded={disclosure?.expanded}
  aria-controls={disclosure?.expanded ? disclosure.controls : undefined}
  data-state={disclosure ? disclosure.expanded ? "open" : "closed" : undefined} aria-current={current || undefined}
  onclick={() => { if (status === "ready") onclick?.(); }} class="relative min-w-0 overflow-hidden {shown === 'icon' ? '' : 'w-fit max-w-[min(100%,22rem)]'}"
  disabled={status !== "ready"} aria-busy={status === "pending"} aria-label={label} title={reason ?? (compact ? label : undefined)}
  aria-describedby={reason ? descriptionId : undefined}
  data-action="" data-action-face={face} data-emphasis={emphasis}>
  <span bind:this={caption} data-button-label aria-hidden="true" class={cn("min-w-0 truncate", face !== "label" && "invisible")}>{label}</span>
  <span class={cn("absolute inset-0 flex items-center justify-center", face === "label" && "invisible")}
    aria-hidden="true" data-button-glyph data-action-face={face}>
    <Icon name={status === "pending" ? "loader-circle" : actionIconNames[icon]} placement="inline-start" decorative />
  </span>
</Button>
{#if reason}<span id={descriptionId} class="sr-only">{reason}</span>{/if}
