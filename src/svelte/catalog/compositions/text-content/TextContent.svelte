<script lang="ts">
  import { Information, StackItem } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { text }: CatalogProps<"text-content"> = $props();
</script>

<!-- Reading placement belongs to this catalog composition, never its adapter. -->
<StackItem placement="content"><Information items={[{ kind: "text", text }]} /></StackItem>
