<script lang="ts">
  import { tick, untrack } from "svelte";
  import { bindViewEvents, type OwnedResolvedPanel, type OwnedViewEvent, type ViewEventOwner } from "../../../../web/client/view-events.ts";
  import type { BankEvent } from "../../../../interaction/bank-events.ts";
  import { ViewPanel } from "../../../adapter-catalog.ts";
  let { panel, onevent }: { panel?: OwnedResolvedPanel | null; onevent: (event: OwnedViewEvent) => void } = $props();
  let mounted = $state.raw<OwnedResolvedPanel | null>(null);
  let open = $state(false);
  let revision = 0;
  $effect(() => {
    const next = panel;
    const current = ++revision;
    untrack(() => {
      if (next) {
        const firstMount = mounted === null;
        mounted = next;
        // The shared Drawer must observe closed → open, just like the stable
        // retained bank specimen. Do not mount it already at its final state.
        if (firstMount) void tick().then(() => { if (revision === current) open = true; });
        else open = true;
      }
      else open = false;
    });
  });
  function dispatch(owner: ViewEventOwner) {
    const send = bindViewEvents(owner, onevent);
    return (event: BankEvent) => {
      if (event.kind === "transient.closed" && !panel && mounted?.owner === owner) mounted = null;
      send(event);
    };
  }
</script>

{#each mounted ? [mounted] : [] as current}
  <ViewPanel panel={current} {open} frameIdentity={current.owner} onevent={dispatch(current.owner)} />
{/each}
