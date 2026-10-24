<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  // Placement belongs to composition, never to Badge, Avatar or Image itself.
  let { placement, kind, children }: CatalogProps<"stack-item"> = $props();
</script>
<div data-stack-item data-stack-kind={kind} data-stack-placement={placement}>
  {@render children?.()}
</div>
