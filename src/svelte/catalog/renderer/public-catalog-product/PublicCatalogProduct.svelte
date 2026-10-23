<script lang="ts">
  import type { PublicCatalogSurface } from "../../../../public-catalog/client.ts";
  import { PublicCatalogProductContent } from "../../../adapter-catalog.ts";
  let { surface }: { surface: PublicCatalogSurface } = $props();
</script>

<PublicCatalogProductContent {surface} />

