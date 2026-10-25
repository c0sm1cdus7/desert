<script lang="ts">
  // F1-merge: transitional adapter of the renamed piece. View-panel (lane E) mounts Modal(adaptive|transient, continuity)
  // over SurfaceFrame itself and maps dismissal to the frame's secondary intent; this folder is deleted in Batch 3.
  import { Modal } from "../../index.ts";
  import { SurfaceFrame } from "../../index.ts";
  import { InstanceFrame } from "../../index.ts";
  import { transientFrame } from "../../../../interaction/transient-frame.ts";
  import type { SurfaceIntent } from "../../../../interaction/intent.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { label, open, locked = false, onclose, onclosed, frame, invoke, edit, continuity, readingIdentity, body, controlEvent, presentation }:
    CatalogProps<"drawer"> = $props();
  let composition = $derived(transientFrame(frame, locked));
  let frames = $derived(continuity ? { frame: continuity, ...readingIdentity ? { reading: readingIdentity } : {} } : undefined);
  let modal = $state<ReturnType<typeof Modal>>();
  let dispatch = $derived.by(() => {
    const receiver = invoke, owner = continuity;
    return (intent: SurfaceIntent) => {
      if (owner === continuity) modal?.noteInvocation(intent.kind === "back" || intent.kind === "close" ? "close" : "other");
      receiver(intent);
    };
  });
  const close = () => {
    const navigation = composition.bottom.secondary;
    if (locked || navigation?.state !== "ready") return;
    if (navigation.intent.kind === "close") { modal?.noteInvocation("close"); onclose?.(); }
    else dispatch(navigation.intent);
  };
</script>
<Modal bind:this={modal} {label} {open} {locked} presentation={presentation === "transient" ? "transient" : "adaptive"} continuity={frames}
  ondismiss={close} {onclosed}>
  {#if continuity}
    {#key continuity}<InstanceFrame frame={composition} {body} {edit} invoke={dispatch} {controlEvent} />{/key}
  {:else}
    <SurfaceFrame frame={composition} {edit} {controlEvent} presentation="transient" invoke={intent => intent.kind === "close" ? close() : dispatch(intent)} />
  {/if}
</Modal>
