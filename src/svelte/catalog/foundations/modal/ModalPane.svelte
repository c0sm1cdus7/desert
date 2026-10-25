<script lang="ts">
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  // Modal part: the pane of an adaptive, transient or navigation modal. An adaptive pane docks beside its parent when the
  // launching host has room (it is then not modal); otherwise it is modal at the right edge, or at the bottom edge with
  // its grip. Fit, modality and edge come from the host's available space, never a browser breakpoint.
  import { tick, type Snippet } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import * as Dialog from "../../../vendor/components/ui/dialog/index.js";
  import { useSurfaceHost } from "../../mechanisms/surface-host/surface-host.svelte.ts";
  import { surfaceFocus } from "../../mechanisms/surface-focus/surface-focus.svelte.ts";
  import DrawerGrip from "./DrawerGrip.svelte";
  import { drawerMotion } from "./drawer-motion.svelte.ts";
  import { frameContinuity, type FrameIdentity, type FrameInvocation } from "./frame-continuity.svelte.ts";
  import { adaptiveSurfaceLayout } from "./adaptive-surface-layout.ts";
  import { adaptiveModality } from "./adaptive-modality.svelte.ts";
  let { label, open, locked, presentation, continuity, density, dismiss, onclosed, children }: {
    label: string; open: boolean; locked: boolean; presentation: "adaptive" | "transient" | "navigation";
    continuity: FrameIdentity | undefined; density: string | undefined;
    dismiss: () => void; onclosed: (() => void) | undefined; children: Snippet | undefined;
  } = $props();
  let content = $state<HTMLElement | null>(null);
  const frames = frameContinuity(() => content, () => continuity);
  export function noteInvocation(kind: FrameInvocation) { frames.note(kind); }
  let opener: HTMLElement | null = null, wasOpen = false;
  $effect.pre(() => {
    if (open && !wasOpen) opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    wasOpen = open;
  });
  const host = useSurfaceHost();
  const owner = Symbol("adaptive-pane");
  const lateral = $derived(presentation === "navigation");
  const layout = $derived(adaptiveSurfaceLayout(host.availableInline, host.textSize, presentation === "adaptive" && host.canDock(owner)));
  const docked = $derived(layout.docked);
  // A docked replacement may mount already open. Do not acquire a transient body lock against the pre-measurement zero
  // width: that false modal can be removed before the lock's teardown effect has even registered.
  const modal = $derived(open && host.measured && !docked);
  $effect(() => { host.reserve(owner, open && docked && !lateral ? layout.reservation : 0); });
  $effect(() => () => host.reserve(owner, 0));
  adaptiveModality(() => content, () => modal && !lateral);
  const motion = drawerMotion(() => dismiss(), () => locked || docked || lateral, () => layout.edge);
  const edge = $derived(lateral ? "left" : motion.edge);
  const width = $derived(lateral ? "18rem" : `${layout.paneWidth}px`);
  const dragHeader = (event: PointerEvent) => {
    const target = event.target;
    if (docked || lateral || layout.edge === "bottom" || !(target instanceof Element) || !target.closest(".workspace-header")
      || target.closest("button,a,input,textarea,select,[contenteditable],.toolbar-title,.toolbar-subtitle")) return;
    motion.down(event);
  };
  const focus = surfaceFocus(() => content);
  const restore = (event: Event) => {
    event.preventDefault();
    const target = opener, active = document.activeElement;
    const ownsFocus = !active || active === document.body || content?.contains(active);
    if (ownsFocus) void tick().then(() => {
      if (target?.isConnected && !target.closest("[inert],[hidden]")) target.focus({ preventScroll: true });
    });
  };
</script>
<Dialog.Root {open} onOpenChange={next => { if (!next) dismiss(); }}
  onOpenChangeComplete={next => { if (!next) { motion.reset(); onclosed?.(); } }}>
  <Dialog.Content bind:ref={content} presentation="panel" class={density} data-modal={presentation} data-composition="transient"
    adaptiveModal={lateral ? undefined : !docked} trapFocus={lateral ? undefined : false} preventScroll={lateral ? undefined : modal}
    data-adaptive-surface={lateral ? undefined : ""} data-presentation={lateral ? "overlay" : docked ? "docked" : "transient"}
    data-locked={locked || undefined} data-reduced-motion={prefersReducedMotion.current} data-edge={edge}
    overlayStyle={motion.overlayStyle} data-dragging={motion.dragging || undefined}
    style={`--panel-width:${width};--adaptive-left:${host.bounds.left}px;--adaptive-top:${host.bounds.top}px;--adaptive-right:${host.bounds.right}px;--adaptive-bottom:${host.bounds.bottom}px;transform:${motion.transform}`}
    onpointerdown={dragHeader} onpointermove={motion.move} onpointerup={motion.up}
    onpointercancel={motion.cancel} onlostpointercapture={motion.lost}
    onOpenAutoFocus={event => focus.open(event)} onCloseAutoFocus={event => focus.close(event, restore)}
    onEscapeKeydown={event => { event.preventDefault(); if (!docked || content?.contains(document.activeElement)) dismiss(); }}
    onInteractOutside={event => { event.preventDefault(); if (!docked) dismiss(); }}>
    <Dialog.Title class="sr-only">{label}</Dialog.Title>
    <Dialog.Description class="sr-only">{say(m.modal.description)}</Dialog.Description>
    {#if edge === "bottom" && !docked}<DrawerGrip {motion} {locked} />{/if}
    {@render children?.()}
  </Dialog.Content>
</Dialog.Root>
