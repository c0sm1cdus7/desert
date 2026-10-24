<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import * as Dialog from "../../../vendor/components/ui/dialog/index.js";
  import { useSurfaceTypography } from "../../../infra/surface-typography.svelte.ts";
  import { SurfaceFrame } from "../../index.ts";
  import { surfaceFrame, SurfaceFrameVersion } from "../../../../interaction/surface-frame.ts";
  import { transientFrame } from "../../../../interaction/transient-frame.ts";
let { open, title, description, close, severity = "error", locked = false }: CatalogProps<"problem"> = $props();
  let frame = $derived(transientFrame(surfaceFrame({ version: SurfaceFrameVersion, kind: "message",
    top: { title, face: { kind: "status", severity } }, content: { kind: "message", text: description }, bottom: {} }), locked));
  const dismiss = () => { if (!locked) close(); };
  const density = useSurfaceTypography();
</script>
<Dialog.Root {open} onOpenChange={next => { if (!next) dismiss(); }}>
    <Dialog.Content presentation="message" density={density()} data-composition="problem" data-severity={severity}
      onInteractOutside={event => { if (locked) event.preventDefault(); }}
      onEscapeKeydown={event => { if (locked) event.preventDefault(); }}>
      <SurfaceFrame {frame} presentation="message" invoke={intent => { if (intent.kind === "close") dismiss(); }} />
    </Dialog.Content>
</Dialog.Root>
