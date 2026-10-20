<script lang="ts">
  import { tick, untrack } from "svelte";
  import type { ResolvedPanel } from "../../views/resolved.ts";
  import type { BankEvent } from "../../interaction/bank-events.ts";
  import { BankVersion } from "../../interaction/bank-node.ts";
  import BankRenderer from "../BankRenderer.svelte";
  let { panel, onevent }: { panel?: ResolvedPanel | null; onevent: (event: BankEvent) => void } = $props();
  let mounted = $state.raw<ResolvedPanel | null>(null);
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
  function dispatch(event: BankEvent) {
    if (event.kind === "transient.closed" && !panel) mounted = null;
    onevent(event);
  }
</script>

{#if mounted}
  <BankRenderer node={{ version: BankVersion, kind: "transient", label: mounted.label,
    frame: mounted.frame, locked: mounted.locked, open }} onevent={dispatch} />
{/if}
