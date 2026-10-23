<script lang="ts">
  import type { Snippet } from "svelte";
  import "@desert/svelte/theme.css";

  // The generated host owns the stylesheet entry, independently of its renderer.
  let { children }: { children: Snippet } = $props();
</script>

{@render children()}
