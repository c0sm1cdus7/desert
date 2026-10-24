<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { ToolbarLayout } from "../../index.ts";
  let { toolbar, invoke, submit, presentation = "standard", controls }: CatalogProps<"toolbar"> = $props();
</script>

<ToolbarLayout content={{kind:"commands",toolbar,invoke,submit,presentation,controls}} />
