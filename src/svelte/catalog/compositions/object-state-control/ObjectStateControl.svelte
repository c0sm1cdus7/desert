<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { ObjectStateRow } from "../../index.ts";
  let { selectors, onselect }: CatalogProps<"object-state-control"> = $props();
</script>
<dl class="bank-stack" data-material="pane" data-composition="object-state-control">
  {#each selectors as selector}<ObjectStateRow {selector} {onselect}/>{/each}
</dl>
