<script lang="ts">
  import * as Dialog from "../../../vendor/components/ui/dialog/index.js";
  import { SurfaceFrame } from "../../index.ts";
  import type { SurfaceFrame as Frame } from "../../../../interaction/surface-frame.ts";
  import type { SurfaceIntent } from "../../../../interaction/intent.ts";
  let { frame, open, locked, invoke, onclosed }: {
    frame: Extract<Frame,{kind:"confirmation"}>; open:boolean; locked:boolean;
    invoke:(intent:SurfaceIntent)=>void; onclosed:()=>void;
  } = $props();
  function cancel() {
    if(!locked && frame.bottom.secondary?.state === "ready") invoke(frame.bottom.secondary.intent);
  }
</script>
<Dialog.Root {open} onOpenChange={next=>{if(!next) cancel();}} onOpenChangeComplete={next=>{if(!next) onclosed();}}>
  <Dialog.Content presentation="message" showCloseButton={false}
    onInteractOutside={event=>{event.preventDefault();cancel();}} onEscapeKeydown={event=>{event.preventDefault();cancel();}}>
    <SurfaceFrame {frame} presentation="message" {invoke} />
  </Dialog.Content>
</Dialog.Root>
