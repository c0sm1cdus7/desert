<script lang="ts">
  import * as Popover from "../../../vendor/components/ui/popover/index.js";
  import { dismissWhenInactive } from '../../../infra/surface-activity.svelte.ts';
  import { anchoredTabExit } from '../../../infra/anchored-tab-exit.ts';
  import FrameBody from "../../renderer/frame-body/FrameBody.svelte";
  import BankRenderer from "../../renderer/bank-renderer/BankRenderer.svelte";
  import { BankVersion } from "../../../../interaction/bank-node.ts";
  import type { FrameContent } from "../../../../interaction/surface-frame.ts";
  import type { SurfaceIntent } from "../../../../interaction/intent.ts";
  import type { ActionIcon } from "../../../../interaction/toolbar.ts";
  let { label, title, content, open, disabled = false, locked = false, onchange, invoke = () => {}, icon = "open" }: {
    label: string; title: string; content: Extract<FrameContent, { kind: "information" | "utilities" }>;
    open: boolean; disabled?: boolean; locked?: boolean | undefined; onchange: (open: boolean) => void;
    invoke?: (intent: SurfaceIntent) => void; icon?: ActionIcon;
  } = $props();
  const panelId = $props.id();
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
  <Popover.Trigger {disabled}>
    {#snippet child({ props })}
      <BankRenderer node={{ version: BankVersion, kind: "action", role: "secondary", action: {
        icon, label, state: disabled ? "unavailable" : "ready", intent: { kind: "transient.open" },
      } }} actionElementProps={{ ...props, "aria-controls": open ? panelId : undefined }} />
    {/snippet}
  </Popover.Trigger>
  <Popover.Content id={panelId} bind:ref={panel} role="dialog" aria-label={title} aria-modal="false" trapFocus={false} preventScroll={false}
    onkeydowncapture={event => {
      if (panel && !locked) anchoredTabExit(event, panel, () => { outside = true; change(false); });
    }}
    onEscapeKeydown={guard} onInteractOutside={interactOutside} onCloseAutoFocus={closeFocus} onFocusOutside={focusOutside}
    data-presentation="anchored">
    <FrameBody {content} {invoke} edit={() => {}} />
  </Popover.Content>
</Popover.Root>
