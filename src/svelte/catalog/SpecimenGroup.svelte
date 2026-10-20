<script lang="ts">
  import type { Snippet } from "svelte";
  import type { PrimitiveId } from "../../interaction/catalog.ts";
  import { catalogTitle } from "./navigation.ts";
  import ContractInspection from "./ContractInspection.svelte";
  let { id, hidden = false, headingLevel = 3, children }: {
    id: PrimitiveId; hidden?: boolean; headingLevel?: 2 | 3; children: Snippet;
  } = $props();
</script>

<section data-catalog-entry={id} aria-label={id} class="flex min-w-0 flex-col gap-3" {hidden}>
    <header class="flex flex-col gap-1 px-4">
      <svelte:element this={`h${headingLevel}`} class="type-section">{catalogTitle(id)}</svelte:element>
      <code class="type-caption break-all text-muted-foreground">{id}</code>
    </header>
    <ContractInspection {id} />
    <div data-specimen-group={id} class="place-stack-content flex min-w-0 flex-col gap-6">
      {@render children()}
    </div>
</section>
