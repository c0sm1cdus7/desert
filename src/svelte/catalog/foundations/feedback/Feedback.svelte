<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  let { text }: CatalogProps<"feedback"> = $props();
</script>

<p role="status" class="type-support">{text}</p>
