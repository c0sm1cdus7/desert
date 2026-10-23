<script lang="ts">
  import { Button } from "../../../vendor/components/ui/button/index.js";
  import Loader2 from "@lucide/svelte/icons/loader-2";
  import { cn } from "../../../vendor/utils.js";
  import type { ToolbarAction } from "../../../../interaction/toolbar.ts";
  import { actionIcons } from "../../../infra/action-icons.ts";
  import type { ActionElementProps } from "../../../action-adapter.ts";
  let { label, icon, state: status = "ready", emphasis = "secondary", onclick, type = "button", elementProps, reason }: {
    label: string; icon: keyof typeof actionIcons; state?: ToolbarAction["state"];
    emphasis?: "primary" | "secondary"; onclick?: () => void; type?: "button" | "submit";
    elementProps?: ActionElementProps | undefined; reason?: string | undefined;
  } = $props();
  const id = $props.id();
  const descriptionId = `${id}-reason`;
  function buttonEvent<E extends Event>(event: E): event is E & { currentTarget: EventTarget & HTMLButtonElement } {
    return event.currentTarget instanceof HTMLButtonElement;
  }
  function forward<E extends Event>(handler: ((event: E & { currentTarget: EventTarget & HTMLButtonElement }) => void) | null | undefined) {
    return (event: E) => { if (status === "ready" && buttonEvent(event)) handler?.(event); };
  }
  // Only overlay semantics/events and Svelte ref attachments cross this internal adapter.
  let overlay = $derived.by(() => {
    const props = elementProps ?? {};
    return { id: props.id, "aria-expanded": props["aria-expanded"], "aria-controls": props["aria-controls"],
      "aria-haspopup": props["aria-haspopup"], "data-state": props["data-state"], onkeydown: forward<KeyboardEvent>(props.onkeydown),
      onpointerdown: forward<PointerEvent>(props.onpointerdown), onpointerenter: forward<PointerEvent>(props.onpointerenter),
      onpointerleave: forward<PointerEvent>(props.onpointerleave),
      ...Object.fromEntries(Object.getOwnPropertySymbols(props).map(key => [key, props[key]])) };
  });
  let button = $state<HTMLButtonElement | null>(null);
  let caption = $state<HTMLSpanElement | null>(null);
  let compact = $state(false);
  let Icon = $derived(status === "pending" ? Loader2 : actionIcons[icon]);
  let face = $derived(status === "pending" ? "pending" : compact ? "icon" : "label");
  $effect(() => {
    label;
    if (!button || !caption) return;
    const element = button, text = caption;
    const measure = () => { compact = text.scrollWidth > text.clientWidth + 1; };
    const observer = new ResizeObserver(measure);
    observer.observe(element); observer.observe(text); measure();
    document.fonts.addEventListener("loadingdone", measure);
    return () => { observer.disconnect(); document.fonts.removeEventListener("loadingdone", measure); };
  });
</script>
<Button {...overlay} bind:ref={button} variant={emphasis === "primary" ? "default" : "secondary"}
  size="default" spin={status === "pending"} {type} onclick={event => { if (status !== "ready") return;
    if (buttonEvent(event)) elementProps?.onclick?.(event); if (!event.defaultPrevented) onclick?.(); }} class="relative w-fit min-w-0 max-w-[min(100%,22rem)] self-start justify-self-start overflow-hidden"
  disabled={status !== "ready"} aria-busy={status === "pending"} aria-label={label} title={reason ?? (compact ? label : undefined)}
  aria-describedby={reason ? descriptionId : undefined}
  data-primitive="action" data-button-face={face} data-emphasis={emphasis}>
  <span bind:this={caption} data-button-label aria-hidden="true" class={cn("min-w-0 truncate", face !== "label" && "invisible")}>{label}</span>
    <span class={cn("absolute inset-0 flex items-center justify-center", face === "label" && "invisible")}
      aria-hidden="true" data-button-glyph data-button-face={face}>
      <Icon data-icon="inline-start" aria-hidden="true" />
    </span>
</Button>
{#if reason}<span id={descriptionId} class="sr-only">{reason}</span>{/if}
