<script lang="ts">
  import type { ResolvedPanel } from "../../../../views/resolved.ts";
  import { bankEvent, type BankEvent } from "../../../../interaction/bank-events.ts";
  import type { SurfaceIntent } from "../../../../interaction/intent.ts";
  import Drawer from "../../foundations/drawer/Drawer.svelte";
  import ConfirmationDialog from "../confirmation-dialog/ConfirmationDialog.svelte";
  import type { FormControlEvent } from "../../../../interaction/form-control-event.ts";
  let { panel, open, frameIdentity, onevent }: { panel: ResolvedPanel; open: boolean;
    frameIdentity: object; onevent: (event: BankEvent) => void } = $props();
  let events = $derived.by(() => {
    // Each keyed frame captures its own receiver, including delayed teardown.
    const sink = onevent;
    const send = (event: BankEvent) => sink(bankEvent(event));
    return {
      close: () => send({ kind: "transient.close" }),
      closed: () => send({ kind: "transient.closed" }),
      invoke: (intent: SurfaceIntent) => send({ kind: "surface.invoke", intent }),
      edit: (name: string, value: string) => send({ kind: "input.change", name, value }),
      controls: (event: FormControlEvent) => send(event),
    };
  });
</script>

{#if panel.frame.kind === "confirmation"}
  <ConfirmationDialog frame={panel.frame} {open} locked={panel.locked} invoke={events.invoke} onclosed={events.closed} />
{:else}
<Drawer label={panel.label} {open} locked={panel.locked} frame={panel.frame} body={panel.body} {frameIdentity} readingIdentity={panel.readingIdentity} presentation={panel.presentation}
  onclose={events.close} onclosed={events.closed} invoke={events.invoke} edit={events.edit} controlEvent={events.controls} />
{/if}
