<script lang="ts">
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  // Modal part: the navigation pane at the left edge, over a workspace with no room to dock it. An edge swipe may draw it
  // while it is still closed, following the pointer (`navigation.reveal`); a swipe that opened it keeps the position the
  // pointer gave it (no entrance motion of its own), and a dismissing swipe moves it by `navigation.dismissOffset`.
  // Focus enters it as the dialog family does; on closing, its owner may place focus (provided through surface-focus).
  import type { Snippet } from "svelte";
  import * as Dialog from "../../../vendor/components/ui/dialog/index.js";
  import { takeCloseFocus } from "../../mechanisms/surface-focus/focus-return.ts";
  let { label, open, navigation, dismiss, onclosed, children }: {
    label: string; open: boolean; navigation: { panel: string; reveal?: number; dismissOffset: number; gesture: boolean } | undefined;
    dismiss: () => void; onclosed: (() => void) | undefined; children: Snippet | undefined;
  } = $props();
  const closeFocus = takeCloseFocus();
  const revealing = $derived(navigation?.reveal !== undefined);
  const transform = $derived(revealing ? `translateX(calc(-100% - var(--surface-inset) + ${navigation?.reveal ?? 0}px))`
    : `translateX(${-(navigation?.dismissOffset ?? 0)}px)`);
</script>
<!-- The pane keeps the marks of the sidebar it presents (`data-sidebar`, `data-slot`): the lateral motion and the
     workspace's overlay rules read them. -->
<Dialog.Root {open} onOpenChange={next => { if (!next) dismiss(); }} onOpenChangeComplete={next => { if (!next) onclosed?.(); }}>
  <Dialog.Content presentation="panel" forceMount={revealing} preventScroll={!revealing} data-modal="navigation"
    data-revealing={revealing || undefined} data-gesture-enter={navigation?.gesture || undefined} data-edge="left"
    data-sidebar="sidebar" data-slot="sidebar" data-presentation="overlay" id={navigation?.panel} inert={!open}
    onCloseAutoFocus={closeFocus} onEscapeKeydown={event => { event.preventDefault(); dismiss(); }}
    onInteractOutside={event => { event.preventDefault(); dismiss(); }}
    class="p-0 text-sidebar-foreground density-comfortable" style={`--panel-width:18rem;transform:${transform};`}>
    <Dialog.Title class="sr-only">{label}</Dialog.Title>
    <Dialog.Description class="sr-only">{say(m.modal.navigationDescription)}</Dialog.Description>
    <div class="flex h-full min-h-0 w-full flex-col">{@render children?.()}</div>
  </Dialog.Content>
</Dialog.Root>
