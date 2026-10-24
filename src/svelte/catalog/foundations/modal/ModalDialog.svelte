<script lang="ts">
  // Modal part: a centred message dialog, or the full-screen stage of media. Escape and the scrim dismiss it unless locked.
  import type { Snippet } from "svelte";
  import * as Dialog from "../../../vendor/components/ui/dialog/index.js";
  import { surfaceFocus } from "../../mechanisms/surface-focus/surface-focus.svelte.ts";
  import { takeOpenFocus } from "../../mechanisms/surface-focus/focus-return.ts";
  let { label, open, presentation, density, dismiss, onclosed, children }: {
    label: string; open: boolean; presentation: "message" | "media"; density: string | undefined;
    dismiss: () => void; onclosed: (() => void) | undefined; children: Snippet | undefined;
  } = $props();
  let content = $state<HTMLElement | null>(null);
  const focus = surfaceFocus(() => content);
  // The owner of what the dialog shows may place focus on opening (the media viewer's close command).
  const openFocus = takeOpenFocus();
</script>
<Dialog.Root {open} onOpenChange={next => { if (!next) dismiss(); }} onOpenChangeComplete={next => { if (!next) onclosed?.(); }}>
  <Dialog.Content bind:ref={content} {presentation} class={density} data-modal={presentation}
    onOpenAutoFocus={event => focus.open(event, openFocus)} onCloseAutoFocus={event => focus.close(event)}
    onEscapeKeydown={event => { event.preventDefault(); dismiss(); }}
    onInteractOutside={event => { event.preventDefault(); dismiss(); }}>
    <Dialog.Title class="sr-only">{label}</Dialog.Title>
    {@render children?.()}
  </Dialog.Content>
</Dialog.Root>
