<script lang="ts">
  import { tick } from 'svelte';
  import * as Dialog from "../../../vendor/components/ui/dialog/index.js";
  import { DrawerGrip } from "../../index.ts";
  import { prefersReducedMotion } from "svelte/motion";
  import { drawerMotion } from "../../../infra/drawer-motion.svelte.ts";
  import { useSurfaceHost } from "../../../infra/surface-host.svelte.ts";
  import { SurfaceFrame } from "../../index.ts";
  import { InstanceFrame } from "../../index.ts";
  import type { SurfaceFrame as Frame } from "../../../../interaction/surface-frame.ts";
  import type { ResolvedView } from "../../../../views/resolved.ts";
  import { transientFrame } from "../../../../interaction/transient-frame.ts";
  import type { SurfaceIntent } from "../../../../interaction/intent.ts";
  import { surfaceFocus } from "../../../infra/surface-focus.svelte.ts";
  import { adaptiveSurfaceLayout } from './adaptive-surface-layout.ts';
  import { adaptiveModality } from './adaptive-modality.svelte.ts';
  import type { FormControlEvent } from "../../../../interaction/form-control-event.ts";
  import { frameContinuity } from "../../../infra/frame-continuity.svelte.ts";
let { label, open, locked = false, onclose, onclosed, frame, invoke, edit, frameIdentity, readingIdentity, body, controlEvent, presentation }: {
    label: string; open: boolean; locked?: boolean; onclose: () => void;
    onclosed?: () => void; frame: Frame; invoke: (intent: SurfaceIntent) => void;
    edit?: (name: string, value: string) => void;
    frameIdentity?: object | undefined;
    readingIdentity?: string | undefined;
    body?: ResolvedView | undefined;
    controlEvent?: ((event: FormControlEvent) => void) | undefined;
    presentation?: "transient" | undefined;
  } = $props();
  let composition = $derived(transientFrame(frame, locked));
  let content = $state<HTMLElement | null>(null);
  const continuity = frameContinuity(() => content, () => frameIdentity, () => frame, () => readingIdentity);
  let dispatch = $derived.by(() => {
    const receiver = invoke, owner = frameIdentity;
    return (intent: SurfaceIntent) => {
      if (owner === frameIdentity) continuity.invoking(intent);
      receiver(intent);
    };
  });
  let opener: HTMLElement | null = null;
  let wasOpen = false;
  $effect.pre(() => {
    if (open && !wasOpen) opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    wasOpen = open;
  });
  const close = () => {
    const navigation = composition.bottom.secondary;
    if (locked || navigation?.state !== "ready") return;
    if (navigation.intent.kind === "close") { continuity.invoking(navigation.intent); onclose(); }
    else dispatch(navigation.intent);
  };
  const host = useSurfaceHost();
  const owner = Symbol('adaptive-pane');
  const layout = $derived(adaptiveSurfaceLayout(host.availableInline, host.textSize, presentation !== "transient" && host.canDock(owner)));
  const docked = $derived(layout.docked);
  // A docked replacement may mount already open. Do not acquire a transient
  // body lock against the pre-measurement zero width: that false modal can be
  // removed before the lock's teardown effect has even registered.
  const modal = $derived(open && host.measured && !docked);
  $effect(() => { host.reserve(owner, open && docked ? layout.reservation : 0); });
  $effect(() => () => host.reserve(owner, 0));
  adaptiveModality(() => content, () => modal);
  const motion = drawerMotion(close, () => locked || docked, () => layout.edge);
  const dragHeader = (event: PointerEvent) => {
    const target = event.target as HTMLElement;
    if (docked || layout.edge === 'bottom' || !target.closest(".workspace-header") || target.closest(
      "button,a,input,textarea,select,[contenteditable],.toolbar-title,.toolbar-subtitle")) return;
    motion.down(event);
  };
  const enter = surfaceFocus(() => content);
  const focus = (event: Event) => {
    enter(event);
  };
  const restore = (event: Event) => {
    event.preventDefault();
    const target = opener, active = document.activeElement;
    const ownsFocus = !active || active === document.body || content?.contains(active);
    if (ownsFocus) void tick().then(() => {
      if (target?.isConnected && !target.closest('[inert],[hidden]')) target.focus({ preventScroll: true });
    });
  };
</script>
<Dialog.Root {open} dismissOnInactive={false} onOpenChange={next => { if (!next) close(); }}
  onOpenChangeComplete={next => { if (!next) { motion.reset(); onclosed?.(); } }}>
    <Dialog.Content bind:ref={content} presentation="panel" showCloseButton={false} data-composition="transient"
      adaptiveModal={!docked} trapFocus={false} preventScroll={modal}
      data-adaptive-surface data-presentation={docked ? 'docked' : 'transient'} data-locked={locked || undefined}
      overlayStyle={motion.overlayStyle}
      data-reduced-motion={prefersReducedMotion.current} data-edge={motion.edge}
      style={`--panel-width:${layout.paneWidth}px;--adaptive-left:${host.bounds.left}px;--adaptive-top:${host.bounds.top}px;--adaptive-right:${host.bounds.right}px;--adaptive-bottom:${host.bounds.bottom}px;transform:${motion.transform}`} data-dragging={motion.dragging || undefined}
      onpointerdown={dragHeader} onpointermove={motion.move} onpointerup={motion.up}
      onpointercancel={motion.cancel} onlostpointercapture={motion.lost}
      onOpenAutoFocus={focus} onCloseAutoFocus={restore}
      onEscapeKeydown={event => { event.preventDefault(); if (!locked && (!docked || content?.contains(document.activeElement))) close(); }}
      onInteractOutside={event => { event.preventDefault(); if (!locked && !docked) close(); }}>
      <Dialog.Title class="sr-only">{label}</Dialog.Title>
      <Dialog.Description class="sr-only">Close to return. Unsaved writing stays in this session.</Dialog.Description>
      {#if motion.edge === "bottom" && !docked}<DrawerGrip {motion} {locked} />{/if}
      {#if frameIdentity}
        {#key frameIdentity}<InstanceFrame frame={composition} {body} {edit} invoke={dispatch} {controlEvent} />{/key}
      {:else}
        <SurfaceFrame frame={composition} {edit} {controlEvent} presentation="transient" invoke={intent => intent.kind === "close" ? close() : dispatch(intent)} />
      {/if}
    </Dialog.Content>
</Dialog.Root>

<style>
  :global(.drawer[data-adaptive-surface]) {
    top:calc(var(--adaptive-top) + max(var(--surface-inset),env(safe-area-inset-top,0px)));
    right:calc(var(--adaptive-right) + max(var(--surface-inset),env(safe-area-inset-right,0px)));
    bottom:calc(var(--adaptive-bottom) + max(var(--surface-inset),env(safe-area-inset-bottom,0px)));
  }
  :global(.drawer[data-adaptive-surface][data-edge="bottom"]) {
    left:calc(var(--adaptive-left) + max(var(--surface-inset),env(safe-area-inset-left,0px)));
  }
  :global(.drawer[data-adaptive-surface][data-presentation="docked"] .workspace-header) { cursor:auto; }
</style>
