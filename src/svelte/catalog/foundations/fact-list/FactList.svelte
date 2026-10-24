<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  let { children }: CatalogProps<"fact-list"> = $props();
</script>

<dl class="bank-stack material-pane">{@render children?.()}</dl>
