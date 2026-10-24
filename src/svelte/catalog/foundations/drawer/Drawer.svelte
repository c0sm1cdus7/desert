<script lang="ts">
  // F1-merge: transitional adapter of the renamed piece. View-panel (lane E) mounts Modal(adaptive|transient, continuity)
  // over SurfaceFrame itself and maps dismissal to the frame's secondary intent; this folder is deleted in Batch 3.
  import { Modal } from "../../index.ts";
  import { SurfaceFrame } from "../../index.ts";
  import { InstanceFrame } from "../../index.ts";
  import type { SurfaceFrame as Frame } from "../../../../interaction/surface-frame.ts";
  import type { ResolvedView } from "../../../../views/resolved.ts";
  import { transientFrame } from "../../../../interaction/transient-frame.ts";
  import type { SurfaceIntent } from "../../../../interaction/intent.ts";
  import type { FormControlEvent } from "../../../../interaction/form-control-event.ts";
  let { label, open, locked = false, onclose, onclosed, frame, invoke, edit, frameIdentity, readingIdentity, body, controlEvent, presentation }: {
    label: string; open: boolean; locked?: boolean; onclose: () => void;
    onclosed?: () => void; frame: Frame; invoke: (intent: SurfaceIntent) => void;
    edit?: (name: string, value: string) => void;
    frameIdentity?: object | undefined;
    readingIdentity?: string | undefined;
    body?: ResolvedView | undefined;
    controlEvent?: ((event: FormControlEvent) => void) | undefined;
    presentation?: "transient" | undefined;
  } = $props();
  const minted = new WeakMap<object, string>();
  let issued = 0;
  /** The string continuity of a frame identity: a view owner's own key, else a token minted for that object. */
  function frameKey(identity: object): string {
    if ("key" in identity && typeof identity.key === "string") return identity.key;
    const known = minted.get(identity);
    if (known !== undefined) return known;
    const token = `frame-${++issued}`;
    minted.set(identity, token);
    return token;
  }
  let composition = $derived(transientFrame(frame, locked));
  let continuity = $derived(frameIdentity ? { frame: frameKey(frameIdentity), ...readingIdentity ? { reading: readingIdentity } : {} } : undefined);
  let modal = $state<ReturnType<typeof Modal>>();
  let dispatch = $derived.by(() => {
    const receiver = invoke, owner = frameIdentity;
    return (intent: SurfaceIntent) => {
      if (owner === frameIdentity) modal?.noteInvocation(intent.kind === "back" || intent.kind === "close" ? "close" : "other");
      receiver(intent);
    };
  });
  const close = () => {
    const navigation = composition.bottom.secondary;
    if (locked || navigation?.state !== "ready") return;
    if (navigation.intent.kind === "close") { modal?.noteInvocation("close"); onclose(); }
    else dispatch(navigation.intent);
  };
</script>
<Modal bind:this={modal} {label} {open} {locked} presentation={presentation === "transient" ? "transient" : "adaptive"} {continuity}
  ondismiss={close} {onclosed}>
  {#if frameIdentity}
    {#key frameIdentity}<InstanceFrame frame={composition} {body} {edit} invoke={dispatch} {controlEvent} />{/key}
  {:else}
    <SurfaceFrame frame={composition} {edit} {controlEvent} presentation="transient" invoke={intent => intent.kind === "close" ? close() : dispatch(intent)} />
  {/if}
</Modal>
