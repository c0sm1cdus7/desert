<script lang="ts">
  import type { FrameContent } from "../../interaction/surface-frame.ts";
  import ObjectStateRow from "./ObjectStateRow.svelte";
  let { selectors, onselect }: {
    selectors: NonNullable<Extract<FrameContent, { kind: "context" }>["selectors"]>;
    onselect: (journey: string) => void;
  } = $props();
</script>
<dl class="bank-stack" data-material="pane" data-composition="object-state-control">
  {#each selectors as selector}<ObjectStateRow {selector} {onselect}/>{/each}
</dl>
