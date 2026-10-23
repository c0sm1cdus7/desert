<script lang="ts">
  import { observeScrollEdges, type ScrollEdge } from "./scroll-edges.ts";
  let { viewport, owner }: { viewport: HTMLElement | null; owner: HTMLElement | null } = $props();
  let edges = $state<ScrollEdge[]>([]);
  $effect(() => {
    if (!viewport || !owner) return;
    return observeScrollEdges(viewport, owner, value => { edges = value; });
  });
</script>

<div data-scroll-edges aria-hidden="true">
  {#each edges as band (band.edge)}
    <div data-scroll-edge={band.edge} data-active={band.strength > 0} aria-hidden="true"
      style:top="{band.top}px" style:left="{band.left}px" style:width="{band.width}px" style:height="{band.height}px"
      style:--edge-core="{band.core}px" style:--edge-strength={band.strength}></div>
  {/each}
</div>
