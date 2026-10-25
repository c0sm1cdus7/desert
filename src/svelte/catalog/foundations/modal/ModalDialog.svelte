<script lang="ts">
  // Modal part: a centred message dialog, or the full-screen stage of media. Escape and the scrim dismiss it unless locked.
  import type { Snippet } from "svelte";
  import * as Dialog from "../../../vendor/components/ui/dialog/index.js";
  import { surfaceFocus } from "../../mechanisms/surface-focus/surface-focus.svelte.ts";
  import { takeCloseFocus, takeOpenFocus } from "../../mechanisms/surface-focus/focus-return.ts";
  let { label, labelledBy, describedBy, open, presentation, density, dismiss, onclosed, children, actions }: {
    label: string; labelledBy: string | undefined; describedBy: string | undefined; open: boolean; presentation: "message" | "media"; density: string | undefined;
    dismiss: () => void; onclosed: (() => void) | undefined; children: Snippet | undefined; actions: Snippet | undefined;
  } = $props();
  let content = $state<HTMLElement | null>(null);
  const focus = surfaceFocus(() => content);
  // The owner of what the dialog shows may place focus on opening (the media viewer's close command), and on closing.
  const openFocus = takeOpenFocus(), closeFocus = takeCloseFocus();
</script>
<Dialog.Root {open} onOpenChange={next => { if (!next) dismiss(); }} onOpenChangeComplete={next => { if (!next) onclosed?.(); }}>
  <Dialog.Content bind:ref={content} {presentation} class={density} data-modal={presentation} labelledby={labelledBy} describedby={describedBy}
    onOpenAutoFocus={event => focus.open(event, openFocus)} onCloseAutoFocus={event => focus.close(event, closeFocus)}
    onEscapeKeydown={event => { event.preventDefault(); dismiss(); }}
    onInteractOutside={event => { event.preventDefault(); dismiss(); }}>
    <!-- A message that names its own visible heading needs no hidden title. -->
    {#if !labelledBy}<Dialog.Title class="sr-only">{label}</Dialog.Title>{/if}
    <!-- A message's content scrolls inside the pane's inset while its actions stay in view below it; the media stage
         fills the screen edge to edge. -->
    {#if presentation === "message"}
      <div class="modal-message" data-modal-message>
        <div class="modal-message-content" data-modal-message-content>{@render children?.()}</div>
        {#if actions}<div class="modal-message-actions" data-modal-message-actions>{@render actions()}</div>{/if}
      </div>
    {:else}{@render children?.()}{/if}
  </Dialog.Content>
</Dialog.Root>
