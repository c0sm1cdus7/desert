<script lang="ts">
  // Modal part: the sheet that presents a picker at the bottom edge when its anchor has no room. Its grip and its top
  // toolbar close it; focus returns to the trigger that opened it (provided by the popover through surface-focus).
  import type { Snippet } from "svelte";
  import * as Dialog from "../../../vendor/components/ui/dialog/index.js";
  import { Bar } from "../../index.ts";
  import { toolbarAction } from "../../../../interaction/toolbar.ts";
  import { PICKER_PANEL_REM } from "../../../infra/picker-measure.ts";
  import { surfaceFocus } from "../../mechanisms/surface-focus/surface-focus.svelte.ts";
  import { providePane } from "../../mechanisms/pane-context/pane-context.svelte.ts";
  import { takeSheetFocus } from "../../mechanisms/surface-focus/focus-return.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  import DrawerGrip from "./DrawerGrip.svelte";
  import { drawerMotion } from "./drawer-motion.svelte.ts";
  let { label, open, locked, density, dismiss, onclosed, children }: {
    label: string; open: boolean; locked: boolean; density: string | undefined;
    dismiss: () => void; onclosed: (() => void) | undefined; children: Snippet | undefined;
  } = $props();
  let content = $state<HTMLElement | null>(null);
  const motion = drawerMotion(() => dismiss(), () => locked, () => "bottom");
  const focus = surfaceFocus(() => content);
  // A bottom sheet is dragged by its grip, not its header; while it drags, its header shows the drag (pane-context).
  providePane(() => ({ drag: false, dragging: motion.dragging, framed: false }));
  const policy = takeSheetFocus();
  function restore(event: Event) {
    event.preventDefault();
    if (open) return; // A presentation replacement is not dismissal.
    const target = policy?.returnTo();
    if (target?.checkVisibility() && !target.closest("[hidden],[inert]")) target.focus({ preventScroll: true });
  }
</script>
<Dialog.Root {open} onOpenChange={next => { if (!next) dismiss(); }}
  onOpenChangeComplete={next => { if (!next) { motion.reset(); onclosed?.(); } }}>
  <Dialog.Content bind:ref={content} presentation="panel" class={[density, "chrome-inset", "focus-inset"]} data-modal="sheet" data-picker-sheet data-edge="bottom"
    data-size="content" data-locked={locked || undefined} data-dragging={motion.dragging || undefined} overlayStyle={motion.overlayStyle}
    style={`--panel-width:${PICKER_PANEL_REM}rem;transform:${motion.transform}`}
    onOpenAutoFocus={event => focus.open(event, policy?.open)} onCloseAutoFocus={event => focus.close(event, policy ? restore : undefined)}
    onEscapeKeydown={event => { event.preventDefault(); dismiss(); }}
    onInteractOutside={event => { event.preventDefault(); dismiss(); }}>
    <DrawerGrip {motion} {locked} />
    <Dialog.Title class="sr-only">{label}</Dialog.Title>
    <Bar edge="top" purpose="commands" identity={{ title: label }} identityRole="heading" trailing={[]} settingsPlaceholder={false} inert={false}
      leading={toolbarAction({ kind: "close" }, say(m.modal.closeNamed, { label }), "close", !locked)} oninvoke={dismiss} />
    <!-- The picker brings its own insets: a calendar frames its header, a list insets its rows. -->
    <div class="flex min-h-0 flex-col overflow-auto @container" data-picker-content>{@render children?.()}</div>
  </Dialog.Content>
</Dialog.Root>
