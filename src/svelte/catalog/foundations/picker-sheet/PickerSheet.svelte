<script lang="ts">
  import { type Snippet } from "svelte";
  import * as Dialog from "../../../vendor/components/ui/dialog/index.js";
  import Toolbar from "../../compositions/toolbar/Toolbar.svelte";
  import { toolbarAction } from "../../../../interaction/toolbar.ts";
  import DrawerGrip from "../drawer-grip/DrawerGrip.svelte";
  import { drawerMotion } from "../../../infra/drawer-motion.svelte.ts";
  import { PICKER_PANEL_REM } from "../../../infra/picker-presentation.svelte.ts";
  let { open = $bindable(false), label, triggerId, children, contentToolbar = false, onOpenAutoFocus }: {
    open: boolean; label: string; triggerId: string; children: Snippet; contentToolbar?: boolean;
    onOpenAutoFocus?: (event: Event) => void;
  } = $props();
  let content = $state<HTMLElement | null>(null);
  const close = () => { open = false; };
  const motion = drawerMotion(close, () => false, () => "bottom");
  function restore(event: Event) {
    const trigger = document.getElementById(triggerId);
    event.preventDefault();
    if (open) return; // A presentation replacement is not dismissal.
    if (trigger?.checkVisibility() && !trigger.closest('[hidden],[inert]')) trigger.focus({ preventScroll: true });
  }
</script>
<Dialog.Root bind:open onOpenChangeComplete={next => { if (!next) motion.reset(); }}>
  <Dialog.Content bind:ref={content} presentation="panel" showCloseButton={false}
    {...onOpenAutoFocus ? { onOpenAutoFocus } : {}}
    data-picker-sheet data-edge="bottom" data-size="content" data-dragging={motion.dragging || undefined} overlayStyle={motion.overlayStyle}
    style={`--panel-width:${PICKER_PANEL_REM}rem;transform:${motion.transform}`} onCloseAutoFocus={restore}>
    <DrawerGrip {motion} />
    <Dialog.Title class="sr-only">{label}</Dialog.Title>
    {#if !contentToolbar}
      <Toolbar toolbar={{ edge: "top", title: label,
        leading: toolbarAction({ kind: "close" }, `Close ${label}`, "close") }} invoke={close} />
    {/if}
    <div class="min-h-0 @container" class:picker-content-inset={!contentToolbar} class:pt-2={!contentToolbar} class:pb-4={!contentToolbar} class:overflow-auto={!contentToolbar}
      class:flex={contentToolbar} class:flex-col={contentToolbar} class:overflow-hidden={contentToolbar}
      data-picker-content>{@render children()}</div>
  </Dialog.Content>
</Dialog.Root>
