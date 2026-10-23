<script lang="ts">
  import { onDestroy, untrack } from "svelte";
  import * as Field from "../../../vendor/components/ui/field/index.js";
  import ControlRenderer from "../../renderer/control-renderer/ControlRenderer.svelte";
  import { LocalFileHost } from "../../../infra/file-host.ts";
  import { ControlBank } from "../../../../interaction/control-bank.ts";
  import { applyControlEvent, controlNode, type ControlEvent } from "../../../../interaction/control-nodes.ts";
  import type { PrimitiveId } from "../../../../interaction/catalog.ts";
  import SpecimenGroup from "../specimen-group/SpecimenGroup.svelte";
  import SpecimenRow from "../specimen-row/SpecimenRow.svelte";
  import StackLayout from "../../foundations/stack-layout/StackLayout.svelte";
  import Information from "../information/Information.svelte";
  let { visibleIds = ControlBank.map(entry => entry.id), entryIds = ControlBank.map(entry => entry.id) }: {
    visibleIds?: readonly PrimitiveId[]; entryIds?: readonly PrimitiveId[];
  } = $props();
  // A discovery group's ownership is fixed at mount; search changes visibility,
  // never this scope or the local renderer instances and file references it owns.
  const entries = untrack(() => ControlBank.filter(entry => entryIds.includes(entry.id)));
  const specimens = entries.flatMap(entry => entry.specimens);
  let nodes = $state.raw(Object.fromEntries(specimens.map(({ node }) => [node.id, node])));
  let notice = $state("No interaction yet.");
  const host = new LocalFileHost();
  const releases = new Map<string, ReturnType<typeof setTimeout>>();
  onDestroy(() => { host.dispose(); for (const timer of releases.values()) clearTimeout(timer); });
  function interact(event: ControlEvent) {
    nodes = { ...nodes, [event.control]: applyControlEvent(nodes[event.control]!, event).node };
    notice = `${event.kind} · ${event.control}. Local interaction only.`;
    const specimen = specimens.find(({ node }) => node.id === event.control);
    if (event.kind !== "popover.open" || !event.open || !specimen?.releaseAfterMs) return;
    nodes = { ...nodes, [event.control]: controlNode({ ...nodes[event.control], locked: true }) };
    clearTimeout(releases.get(event.control));
    // The isolated specimen owner releases its own demonstration lock. Real hosts
    // never infer operation completion from elapsed time.
    releases.set(event.control, setTimeout(() => {
      nodes = { ...nodes, [event.control]: controlNode({ ...nodes[event.control], locked: false }) };
      releases.delete(event.control);
      notice = "Demonstration lock released. Close returns to the bank.";
    }, specimen.releaseAfterMs));
  }
</script>
<div data-control-bench class="flex min-w-0 flex-col gap-8" hidden={!entries.some(entry => visibleIds.includes(entry.id))}>
  {#each entries as entry (entry.id)}
    <SpecimenGroup id={entry.id} hidden={!visibleIds.includes(entry.id)}>
      {#each entry.specimens as specimen (specimen.node.id)}
        <SpecimenRow id={entry.id} state={specimen.state}>
          <Field.FieldGroup><ControlRenderer node={nodes[specimen.node.id]!} {host} onevent={interact} /></Field.FieldGroup>
        </SpecimenRow>
      {/each}
    </SpecimenGroup>
  {/each}
  <StackLayout title="Interaction"><div role="status" aria-live="polite"><Information items={[{kind:"text",text:notice}]} /></div></StackLayout>
</div>
