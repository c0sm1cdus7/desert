<script lang="ts">
  import * as Card from "../../../vendor/components/ui/card/index.js";
  import type { CatalogProps } from "../../types.d.ts";
  let { children, measure = 'reading' }: CatalogProps<"grouped-panel"> = $props();
</script>

<!-- One shared pane for sibling rows; Stack only supplies hierarchy. -->
<div data-reading-measure={measure === 'reading' || undefined}>
  <Card.Root class="grouped-panel" data-grouped-panel>{@render children?.()}</Card.Root>
</div>
