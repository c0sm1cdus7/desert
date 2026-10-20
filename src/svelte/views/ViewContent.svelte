<script lang="ts">
  import type { ResolvedView } from "../../views/resolved.ts";
  import type { BankEvent } from "../../interaction/bank-events.ts";
  import type { PrimitiveId } from "../../interaction/catalog.ts";
  import StackLayout from "../pieces/StackLayout.svelte";
  import InspectionContent from "./InspectionContent.svelte";
  import ViewItem from "./ViewItem.svelte";
  let { resolved, onevent }: {
    resolved: ResolvedView;
    onevent: (event: BankEvent) => void;
  } = $props();
  let bank = $state<{ revealEntry: (id: PrimitiveId) => Promise<HTMLElement | null> } | null>(null);
  export async function revealEntry(id: PrimitiveId) { return await bank?.revealEntry(id) ?? null; }
  let hasCatalog = $derived(resolved.view.content.some(item => item.kind === "visual-catalog"));
</script>

<div class:place-content={!hasCatalog} data-view-content={resolved.view.id}>
  {#each resolved.view.content as item, index (index)}
    {#if item.kind === "header"}
      <!-- The shared workspace owns the heading and its scroll-driven toolbar echo. -->
    {:else if item.kind === "stack"}
      <div data-view-item={item.id}>
      <StackLayout title={item.title} description={item.description}>
        {#each item.items as child, childIndex (childIndex)}<ViewItem item={child} {resolved} {onevent} />{/each}
      </StackLayout>
      </div>
    {:else if item.kind === "visual-catalog"}
      <InspectionContent bind:this={bank} />
    {:else}<ViewItem {item} {resolved} {onevent} />{/if}
  {/each}
</div>
