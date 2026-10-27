<script lang="ts">
  // Surface part: a frame's top or bottom slot. It draws nothing; the bars it holds learn they sit on the frame's edge,
  // where they layer above the frame's scroll edges (through the toolbar-scroll mechanism of bar).
  import type { Snippet } from "svelte";
  import { provideFrameEdge } from "../../mechanisms/toolbar-scroll/toolbar-scroll.svelte.ts";
  let { children }: { children: Snippet | undefined } = $props();
  provideFrameEdge(true);
</script>
{@render children?.()}
