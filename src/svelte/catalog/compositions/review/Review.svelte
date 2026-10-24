<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { NodeRenderer } from "../../index.ts";
  import { ResolvedNodeVersion } from "../../../../interaction/resolved-node.ts";
  let { details, recovery }: CatalogProps<"review"> = $props();
</script>
<div data-composition="review"><NodeRenderer node={{ version: ResolvedNodeVersion, kind: "fact", details }} /></div>
{#if recovery}<p class="mt-4 text-muted-foreground" role="status">{recovery}</p>{/if}
