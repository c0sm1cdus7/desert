<script lang="ts">
  import { Icon } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { reason }: CatalogProps<"specimen-unavailable"> = $props();
</script>

<div role="note" aria-label="Specimen unavailable" class="flex min-w-0 items-start gap-2 text-muted-foreground">
  <Icon name="info" decorative leading="list" />
  <div class="type-caption flex min-w-0 flex-col gap-1">
    <strong>Execution adapter required</strong>
    <p>{reason}</p>
  </div>
</div>
