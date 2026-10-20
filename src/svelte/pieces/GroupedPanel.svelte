<script lang="ts">
  import type { Snippet } from "svelte";
  import * as Card from "../vendor/components/ui/card/index.js";
  let { children }: { children: Snippet } = $props();
</script>

<!-- One shared pane for sibling rows; Stack only supplies hierarchy. -->
<Card.Root class="grouped-panel" data-grouped-panel>{@render children()}</Card.Root>
