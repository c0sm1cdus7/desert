<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  let { total, totalLabel, segments, label, id }: CatalogProps<"meter"> = $props();
</script>

<!-- The total reads as it did at 79d8322 (2rem, bold, on one line: third review, the display role was not asked for); its
     label and the legend read at the regular weight, also inside a pressable card (the summary widget's). The bar is a
     line: square ends, never a capsule (law 9d). -->
<div role="group" aria-label={label} {id} class="flex min-w-0 flex-col gap-4" data-meter>
  <span class="flex min-w-0 flex-wrap items-baseline gap-2"><strong class="text-[2rem] leading-none font-bold">{total}</strong><span
    class="font-normal text-muted-foreground">{totalLabel}</span></span>
  <span class="flex h-[.6rem] gap-[2px] overflow-hidden bg-muted" aria-hidden="true">
    {#each segments as segment, index (index)}<span class="min-w-0 basis-0 bg-primary even:bg-muted-foreground" style:flex-grow={segment.count}></span>{/each}
  </span>
  <span class="flex min-w-0 flex-wrap gap-4 font-normal text-muted-foreground [overflow-wrap:anywhere]">
    {#each segments as segment, index (index)}<span class="min-w-0 max-w-full"><strong class="text-foreground">{segment.count}</strong> {segment.label}</span>{/each}
  </span>
</div>
