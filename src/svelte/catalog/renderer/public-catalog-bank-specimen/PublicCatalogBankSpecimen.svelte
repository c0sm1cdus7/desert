<script lang="ts">
  import { onDestroy, untrack } from "svelte";
  import type { CatalogProps } from "../../types.d.ts";
  import { NodeRenderer, Feedback } from "../../index.ts";
  import { catalogSpecimen } from "./catalog-specimen.svelte.ts";
  let { initial, oncatalog }: CatalogProps<"public-catalog-bank-specimen"> = $props();
  const specimen = untrack(() => catalogSpecimen(initial, event => oncatalog?.(event)));
  onDestroy(specimen.dispose);
</script>

{#if specimen.node.kind === "transient" || specimen.node.kind === "problem"}
  <NodeRenderer node={specimen.opener} onevent={specimen.interact} />
{/if}
<NodeRenderer node={specimen.node} onevent={specimen.interact} />
{#if specimen.notice}<Feedback text={specimen.notice} />{/if}
