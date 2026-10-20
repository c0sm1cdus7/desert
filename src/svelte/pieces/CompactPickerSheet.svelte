<script lang="ts">
  import type { Snippet } from "svelte";
  import { tick } from "svelte";
  import * as Dialog from "../vendor/components/ui/dialog/index.js";
  import { Button } from "../vendor/components/ui/button/index.js";
  import X from "@lucide/svelte/icons/x";
  import DrawerGrip from "./DrawerGrip.svelte";
  import { drawerMotion } from "./drawer-motion.svelte.ts";
  let { open = $bindable(false), label, triggerId, children }: {
    open: boolean; label: string; triggerId: string; children: Snippet;
  } = $props();
  let content = $state<HTMLElement | null>(null);
  const close = () => { open = false; };
  const motion = drawerMotion(close, () => false, () => true);
  function focus(event: Event) {
    event.preventDefault();
    void tick().then(() => {
      const target = content?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]:not(:disabled)')
        ?? content?.querySelector<HTMLElement>('[role="option"]:not(:disabled), [data-calendar-day][tabindex="0"]');
      (target ?? content)?.focus({ preventScroll: true });
    });
  }
  function restore(event: Event) {
    const trigger = document.getElementById(triggerId);
    if (trigger) { event.preventDefault(); trigger.focus({ preventScroll: true }); }
  }
</script>
<Dialog.Root bind:open onOpenChangeComplete={next => { if (!next) motion.reset(); }}>
  <Dialog.Content bind:ref={content} presentation="panel" showCloseButton={false}
    data-picker-sheet data-edge="bottom" data-size="content" data-dragging={motion.dragging || undefined} overlayStyle={motion.overlayStyle}
    style={`transform:${motion.transform}`} onOpenAutoFocus={focus} onCloseAutoFocus={restore}>
    <DrawerGrip {motion} />
    <div class="flex shrink-0 items-center gap-3 px-5 pb-3">
      <Dialog.Title class="min-w-0 flex-1">{label}</Dialog.Title>
      <Button variant="ghost" size="icon" aria-label={`Close ${label}`} onclick={close}><X /></Button>
    </div>
    <div class="min-h-0 overflow-auto px-3 pb-4 @container" data-picker-content>{@render children()}</div>
  </Dialog.Content>
</Dialog.Root>
