<script lang="ts">
  import { Information } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { text }: CatalogProps<"text-content"> = $props();
</script>

<!-- Reading placement belongs to this catalog composition, never its adapter. -->
<div data-stack-item data-stack-placement="content"><Information items={[{ kind: "text", text }]} /></div>
