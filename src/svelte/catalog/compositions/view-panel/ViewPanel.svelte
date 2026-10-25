<script lang="ts">
  import { nodeEvent, type NodeEvent } from "../../../../interaction/node-events.ts";
  import type { SurfaceIntent } from "../../../../interaction/intent.ts";
  import { transientFrame } from "../../../../interaction/transient-frame.ts";
  import type { FormControlEvent } from "../../../../interaction/form-control-event.ts";
  import { confirmationDialog, confirmationDismissal } from "../../../infra/confirmation-dialog.ts";
  import { Dialog, InstanceFrame, Modal } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { panel, open, continuity, onevent }: CatalogProps<"view-panel"> = $props();
  let modal = $state<ReturnType<typeof Modal>>();
  let events = $derived.by(() => {
    // Each keyed frame captures its own receiver, including delayed teardown.
    const sink = onevent;
    const send = (event: NodeEvent) => sink?.(nodeEvent(event));
    return {
      close: () => send({ kind: "transient.close" }),
      closed: () => send({ kind: "transient.closed" }),
      invoke: (intent: SurfaceIntent) => send({ kind: "surface.invoke", intent }),
      edit: (name: string, value: string) => send({ kind: "input.change", name, value }),
      controls: (event: FormControlEvent) => send(event),
    };
  });
  let frame = $derived(panel.frame.kind === "confirmation" ? panel.frame : transientFrame(panel.frame, panel.locked));
  // Before the frame invokes, the modal notes whether it is leaving (Back, Close): focus returns to that command.
  let dispatch = $derived.by(() => {
    const receiver = events.invoke, owner = continuity;
    return (intent: SurfaceIntent) => {
      if (owner === continuity) modal?.noteInvocation(intent.kind === "back" || intent.kind === "close" ? "close" : "other");
      receiver(intent);
    };
  });
  /** Escape, the scrim or the grip choose the frame's dismissal: Close closes the panel, Back goes back. */
  function dismiss() {
    const navigation = frame.bottom.secondary;
    if (panel.locked || navigation?.state !== "ready") return;
    if (navigation.intent.kind === "close") { modal?.noteInvocation("close"); events.close(); }
    else dispatch(navigation.intent);
  }
  function answer() {
    if (panel.frame.kind !== "confirmation" || panel.locked) return;
    const intent = confirmationDismissal(panel.frame);
    if (intent) events.invoke(intent);
  }
</script>

{#if panel.frame.kind === "confirmation"}
  {@const ask = confirmationDialog(panel.frame)}
  <Dialog {open} locked={panel.locked} tone="standard" title={ask.title} subtitle={ask.subtitle} face={ask.face}
    primary={ask.primary} secondary={ask.secondary} oninvoke={events.invoke} ondismiss={answer} onclosed={events.closed} />
{:else}
  <Modal bind:this={modal} label={panel.label} {open} locked={panel.locked} presentation={panel.presentation === "transient" ? "transient" : "adaptive"}
    continuity={{ frame: continuity, ...panel.readingIdentity ? { reading: panel.readingIdentity } : {} }} ondismiss={dismiss} onclosed={events.closed}>
    {#key continuity}<InstanceFrame {frame} body={panel.body} edit={events.edit} invoke={dispatch} controlEvent={events.controls} />{/key}
  </Modal>
{/if}
