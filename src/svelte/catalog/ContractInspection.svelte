<script lang="ts">
  import { InteractionCatalog, type PrimitiveId } from "../../interaction/catalog.ts";
  let { id }: { id: PrimitiveId } = $props();
  let inspection = $derived(InteractionCatalog.entries.find(entry => entry.id === id)!.inspection);
  let owners = $derived(inspection.owners.map(owner => InteractionCatalog.foundations.find(item => item.id === owner)!.title));
</script>

<div data-contract-inspection class="flex min-w-0 flex-col gap-2 px-4 type-caption text-muted-foreground">
  <dl class="grid min-w-0 gap-2 sm:grid-cols-2">
    <div><dt class="font-semibold">Shared owners</dt><dd>{owners.join(" · ")}</dd></div>
    <div><dt class="font-semibold">Qualification</dt><dd>Partial · {inspection.fixtures.length} declared fixtures, not a complete matrix.</dd></div>
    {#each Object.entries(inspection.axes) as [axis, values]}
      {#if values.length}<div><dt class="font-semibold capitalize">{axis}</dt><dd>{values.join(" · ")}</dd></div>{/if}
    {/each}
  </dl>
  <div data-coverage-gaps><p class="font-semibold">Coverage gaps</p>
    {#each inspection.gaps as gap}<p>{gap}</p>{/each}
  </div>
  <div data-contract-evidence><p class="font-semibold">Evidence references · not a live test result</p>
    {#each inspection.evidence as path}<code class="block break-all">{path}</code>{/each}
  </div>
</div>
