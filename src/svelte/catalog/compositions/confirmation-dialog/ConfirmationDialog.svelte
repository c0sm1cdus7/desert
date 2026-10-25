<script lang="ts">
  // The transitional adapter of the piece replaced by dialog (DESIGN §4, item 61): view-panel and the shared-owner bank
  // mount Dialog themselves, so nothing mounts this any more; Batch 3 deletes this folder.
  import { Dialog } from "../../index.ts";
  import { confirmationDialog, confirmationDismissal } from "../../../infra/confirmation-dialog.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { frame, open, locked, invoke, onclosed }: CatalogProps<"confirmation-dialog"> = $props();
  let ask = $derived(confirmationDialog(frame));
  function cancel() {
    const intent = confirmationDismissal(frame);
    if (!locked && intent) invoke(intent);
  }
</script>

<Dialog {open} {locked} tone="standard" title={ask.title} subtitle={ask.subtitle} face={ask.face} primary={ask.primary}
  secondary={ask.secondary} oninvoke={invoke} ondismiss={cancel} {onclosed} />
