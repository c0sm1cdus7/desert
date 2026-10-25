<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  // Placement belongs to composition, never to Badge, Avatar or Image itself.
  let { placement, kind, children }: CatalogProps<"stack-item"> = $props();
</script>
<!-- A home stack's rails run edge to edge: its place insets are flush. -->
<div class={kind === "catalog.home" ? "place-insets-flush" : undefined} data-stack-item data-stack-kind={kind} data-stack-placement={placement}>
  {@render children?.()}
</div>
