<script lang="ts">
  // F1-merge: scroll-edges is a part of surface now (DESIGN §1.6). This entry stays only for its last caller, the
  // place foundation, until Batch 3 deletes the folder.
  import Edges from "../surface/ScrollEdges.svelte";
  let { viewport, owner }: { viewport: HTMLElement | null; owner: HTMLElement | null } = $props();
</script>

<Edges {viewport} {owner} />
