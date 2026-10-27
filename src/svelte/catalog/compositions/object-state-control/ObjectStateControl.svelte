<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { List, ObjectStateRow } from "../../index.ts";
  let { selectors, onselect }: CatalogProps<"object-state-control"> = $props();
</script>
<List kind="facts" measure="reading">
  {#each selectors as selector}<ObjectStateRow {selector} {onselect}/>{/each}
</List>
