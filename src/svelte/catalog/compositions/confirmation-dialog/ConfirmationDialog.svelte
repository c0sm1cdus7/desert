<script lang="ts">
  import * as Dialog from "../../../vendor/components/ui/dialog/index.js";
  import { SurfaceFrame } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { frame, open, locked, invoke, onclosed }: CatalogProps<"confirmation-dialog"> = $props();
  function cancel() {
    if(!locked && frame.bottom.secondary?.state === "ready") invoke(frame.bottom.secondary.intent);
  }
</script>
<Dialog.Root {open} onOpenChange={next=>{if(!next) cancel();}} onOpenChangeComplete={next=>{if(!next) onclosed?.();}}>
  <Dialog.Content presentation="message" showCloseButton={false}
    onInteractOutside={event=>{event.preventDefault();cancel();}} onEscapeKeydown={event=>{event.preventDefault();cancel();}}>
    <SurfaceFrame {frame} presentation="message" {invoke} />
  </Dialog.Content>
</Dialog.Root>
