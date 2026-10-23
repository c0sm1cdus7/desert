<script lang="ts">
  import Info from "@lucide/svelte/icons/info";
  let { reason }: { reason: string } = $props();
</script>

<div role="note" aria-label="Specimen unavailable" class="flex min-w-0 items-start gap-2 text-muted-foreground">
  <Info aria-hidden="true" class="mt-0.5 size-4 shrink-0" />
  <div class="type-caption flex min-w-0 flex-col gap-1">
    <strong>Execution adapter required</strong>
    <p>{reason}</p>
  </div>
</div>
