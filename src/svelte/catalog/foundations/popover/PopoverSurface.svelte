<script lang="ts">
  // Popover part: the anchored surface. Bits draws no trigger: the surface anchors to the trigger by id (customAnchor),
  // ignores presses on it (the trigger itself toggles once), and returns focus to it unless dismissal came from outside.
  import type { Snippet } from "svelte";
  import * as Popover from "../../../vendor/components/ui/popover/index.js";
  import { surfaceFocus } from "../../mechanisms/surface-focus/surface-focus.svelte.ts";
  import { anchoredTabExit } from "./anchored-tab-exit.ts";
  import { calendarBudget } from "./picker-presentation.svelte.ts";
  let { label, open, locked, content, align, triggerId, panelId, calendar, density, change, children }: {
    label: string; open: boolean; locked: boolean; content: "information" | "form" | "list" | "menu"; align: "start" | "end";
    triggerId: string; panelId: string; calendar: boolean; density: "comfortable" | "compact" | undefined;
    change: (open: boolean) => void; children: Snippet | undefined;
  } = $props();
  const presentations = { information: "pane", form: "reference", list: "selection", menu: "speed-dial" } as const;
  /** A month calendar frames itself (its header is the surface's top row) at the calendar budget's width. */
  const calendarFrame = `width:${calendarBudget.panelRem}rem;overflow:hidden;padding:0;gap:0`;
  let panel = $state<HTMLElement | null>(null);
  let boundary: HTMLElement | null = null;
  $effect(() => { if (panel) boundary = panel; });
  /** Whether the person dismissed it by interacting elsewhere: focus then stays where they went. */
  let outside = false;
  const onTrigger = (target: EventTarget | null) => target instanceof Element && target.closest(`#${CSS.escape(triggerId)}`) !== null;
  const dismissOutside = () => { if (open && !locked) { outside = true; change(false); } };
  // Focus can leave for the trigger (a press toggles it) without dismissing; elsewhere it dismisses.
  const focus = surfaceFocus(() => panel, () => queueMicrotask(() => {
    const active = document.activeElement;
    if (!panel?.contains(active) && !onTrigger(active)) dismissOutside();
  }));
  function interactOutside(event: Event) {
    if (onTrigger(event.target) || locked) event.preventDefault();
    else outside = true;
  }
  function returnFocus(event: Event) {
    event.preventDefault();
    const leaving = outside, active = document.activeElement, trigger = document.getElementById(triggerId);
    outside = false;
    if (leaving || open || active && active !== document.body && !boundary?.contains(active)) return;
    if (trigger?.checkVisibility() && !trigger.closest("[hidden],[inert]")) trigger.focus({ preventScroll: true });
  }
</script>
<Popover.Root {open} onOpenChange={change}>
  <Popover.Content bind:ref={panel} id={panelId} customAnchor={`#${triggerId}`} presentation={presentations[content]} {density} {align}
    role={content === "list" ? "presentation" : content === "menu" ? undefined : "dialog"}
    aria-label={content === "list" ? undefined : label} aria-modal={content === "list" || content === "menu" ? undefined : "false"}
    style={calendar ? calendarFrame : undefined} data-popover={content} data-presentation="anchored"
    onOpenAutoFocus={event => focus.open(event)} onCloseAutoFocus={event => focus.close(event, returnFocus)}
    onkeydowncapture={event => { if (panel && !locked) anchoredTabExit(event, panel, dismissOutside); }}
    onEscapeKeydown={event => { if (locked) event.preventDefault(); }} onInteractOutside={interactOutside}>
    {@render children?.()}
  </Popover.Content>
</Popover.Root>
