<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { PublicCatalogProductContent } from "../../index.ts";
  let { surface }: CatalogProps<"public-catalog-product"> = $props();
</script>

<PublicCatalogProductContent {surface} />

