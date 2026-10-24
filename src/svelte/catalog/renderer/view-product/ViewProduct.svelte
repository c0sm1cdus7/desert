<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { ViewProductContent } from "../../../adapter-catalog.ts";

  let { program, surface, validateInput, access }: CatalogProps<"view-product"> = $props();
</script>

<ViewProductContent {program} {surface} {validateInput} {access} />
