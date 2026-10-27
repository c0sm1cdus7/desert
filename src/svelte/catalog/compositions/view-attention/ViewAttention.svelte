<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { AttentionList } from "../../index.ts";
  let { state, onevent }: CatalogProps<"view-attention"> = $props();
</script>
<AttentionList {state} resume={id => onevent?.({ kind: "attention.resume", id })} />
