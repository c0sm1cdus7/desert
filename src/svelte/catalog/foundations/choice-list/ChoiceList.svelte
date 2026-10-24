<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  let { children }: CatalogProps<"choice-list"> = $props();
</script>

<!-- A transparent geometry owner, never a second pane inside the host. -->
<div class="choice-list material-interior" data-choice-list>{@render children?.()}</div>
