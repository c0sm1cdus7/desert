<script lang="ts">
  import * as Popover from "../../../vendor/components/ui/popover/index.js";
  import { dismissWhenInactive } from '../../../infra/surface-activity.svelte.ts';
  import { anchoredTabExit } from '../../../infra/anchored-tab-exit.ts';
  import { FrameBody } from "../../index.ts";
  import { NodeRenderer } from "../../index.ts";
  import { ResolvedNodeVersion } from "../../../../interaction/resolved-node.ts";
  import type { FrameContent } from "../../../../interaction/surface-frame.ts";
  import type { SurfaceIntent } from "../../../../interaction/intent.ts";
  import type { ActionIcon } from "../../../../interaction/toolbar.ts";
  let { label, title, content, open, disabled = false, locked = false, onchange, invoke = () => {}, icon = "open" }: {
    label: string; title: string; content: Extract<FrameContent, { kind: "information" | "utilities" }>;
    open: boolean; disabled?: boolean; locked?: boolean | undefined; onchange: (open: boolean) => void;
    invoke?: (intent: SurfaceIntent) => void; icon?: ActionIcon;
  } = $props();
  const panelId = $props.id(), triggerId = `${panelId}-trigger`;
  const change = (next: boolean) => { if (!disabled && (next || !locked)) onchange(next); };
  dismissWhenInactive(() => onchange(false));
  const guard = (event: Event) => { if (locked) event.preventDefault(); };
  let outside = false;
  let panel = $state<HTMLElement | null>(null);
  const interactOutside = (event: Event) => { guard(event); outside = !event.defaultPrevented; };
  const focusOutside = (event?: Event) => {
    event?.preventDefault();
    // DismissibleLayer can report the opener's earlier focus event after the
    // surface has mounted. Judge the settled destination, not that stale event.
    queueMicrotask(() => {
      if (panel?.contains(document.activeElement)) return;
      if (open && !locked) { outside = true; change(false); }
    });
  };
  const closeFocus = (event: Event) => {
    // A nonmodal outside interaction keeps the target's focus; Escape returns to the trigger.
    if (outside) event.preventDefault();
    outside = false;
  };
</script>
<Popover.Root {open} onOpenChange={change}>
  <NodeRenderer node={{ version: ResolvedNodeVersion, kind: "action", role: "secondary", action: {
    icon, label, state: disabled ? "unavailable" : "ready", intent: { kind: "transient.open" },
  } }} actionDisclosure={{ id: triggerId, controls: panelId, expanded: open, haspopup: "dialog" }}
    onevent={event => { if (event.kind === "local.invoke" && event.intent.kind === "transient.open") change(!open); }} />
  <Popover.Content id={panelId} customAnchor={`#${triggerId}`} bind:ref={panel} role="dialog" aria-label={title} aria-modal="false" trapFocus={false} preventScroll={false}
    onkeydowncapture={event => {
      if (panel && !locked) anchoredTabExit(event, panel, () => { outside = true; change(false); });
    }}
    onEscapeKeydown={guard} onInteractOutside={interactOutside} onCloseAutoFocus={closeFocus} onFocusOutside={focusOutside}
    data-presentation="anchored">
    <FrameBody {content} {invoke} edit={() => {}} />
  </Popover.Content>
</Popover.Root>
