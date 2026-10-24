<script lang="ts">
  import { onDestroy, untrack } from "svelte";
  import { Column, ControlRenderer, SpecimenGroup, SpecimenRow, StackLayout, Text, ViewRegion } from "../../index.ts";
  import { provideFileHost } from "../../../infra/file-host-context.ts";
  import { ControlSpecimens } from "../../../../interaction/control-specimens.ts";
  import { applyControlEvent, controlNode, type ControlEvent } from "../../../../interaction/control-nodes.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  let { visibleIds = ControlSpecimens.map(entry => entry.id), entryIds = ControlSpecimens.map(entry => entry.id) }: CatalogProps<"control-bench"> = $props();
  // A discovery group's ownership is fixed at mount; search changes visibility,
  // never this scope or the local renderer instances and file references it owns.
  const entries = untrack(() => ControlSpecimens.filter(entry => entryIds.includes(entry.id)));
  const specimens = entries.flatMap(entry => entry.specimens);
  let nodes = $state.raw(Object.fromEntries(specimens.map(({ node }) => [node.id, node])));
  let notice = $state(say(m.controlBench.idle));
  // The bench's file references live in the host it provides to its subtree, disposed with it.
  const host = provideFileHost();
  const releases = new Map<string, ReturnType<typeof setTimeout>>();
  onDestroy(() => { for (const timer of releases.values()) clearTimeout(timer); });
  function interact(event: ControlEvent) {
    nodes = { ...nodes, [event.control]: applyControlEvent(nodes[event.control]!, event).node };
    notice = say(m.controlBench.event, { kind: event.kind, control: event.control });
    const specimen = specimens.find(({ node }) => node.id === event.control);
    if (event.kind !== "popover.open" || !event.open || !specimen?.releaseAfterMs) return;
    nodes = { ...nodes, [event.control]: controlNode({ ...nodes[event.control], locked: true }) };
    clearTimeout(releases.get(event.control));
    // The isolated specimen owner releases its own demonstration lock. Real hosts
    // never infer operation completion from elapsed time.
    releases.set(event.control, setTimeout(() => {
      nodes = { ...nodes, [event.control]: controlNode({ ...nodes[event.control], locked: false }) };
      releases.delete(event.control);
      notice = say(m.controlBench.released);
    }, specimen.releaseAfterMs));
  }
</script>

<ViewRegion kind="item" id="control-bench" visible={entries.some(entry => visibleIds.includes(entry.id))}>
  <Column gap="section">
    {#each entries as entry (entry.id)}
      <SpecimenGroup id={entry.id} hidden={!visibleIds.includes(entry.id)}>
        {#each entry.specimens as specimen (specimen.node.id)}
          <SpecimenRow id={entry.id} state={specimen.state}>
            <!-- lane-merge: control-renderer reads the host from context (useFileHost) and leaves its contract. -->
            <ControlRenderer node={nodes[specimen.node.id]!} {host} onevent={interact} />
          </SpecimenRow>
        {/each}
      </SpecimenGroup>
    {/each}
    <StackLayout title={say(m.controlBench.interaction)}>
      <Column gap="regular" measure="reading"><Text kind="body" inset="row" live="polite" text={notice} /></Column>
    </StackLayout>
  </Column>
</ViewRegion>
