<script lang="ts">
  import type { Snippet } from "svelte";
  import * as Card from "../../../vendor/components/ui/card/index.js";
  let { children, measure = 'reading' }: { children: Snippet; measure?: 'reading' | 'overview' } = $props();
</script>

<!-- One shared pane for sibling rows; Stack only supplies hierarchy. -->
<div data-reading-measure={measure === 'reading' || undefined}>
  <Card.Root class="grouped-panel" data-grouped-panel>{@render children()}</Card.Root>
</div>
