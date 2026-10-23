<script lang="ts">
  import { onDestroy, untrack } from "svelte";
  import type { ResolvedNode } from "../../../../interaction/resolved-node.ts";
  import type { NodeEvent } from "../../../../interaction/node-events.ts";
  import { NodeRenderer, Feedback } from "../../../adapter-catalog.ts";
  import { catalogSpecimen } from "./catalog-specimen.svelte.ts";
  let { initial, oncatalog }: { initial: ResolvedNode; oncatalog: (event: NodeEvent) => void } = $props();
  const specimen = untrack(() => catalogSpecimen(initial, event => oncatalog(event)));
  onDestroy(specimen.dispose);
</script>

{#if specimen.node.kind === "transient" || specimen.node.kind === "problem"}
  <NodeRenderer node={specimen.opener} onevent={specimen.interact} />
{/if}
<NodeRenderer node={specimen.node} onevent={specimen.interact} />
{#if specimen.notice}<Feedback text={specimen.notice} />{/if}
