<script lang="ts">
  import { onDestroy, untrack } from "svelte";
  import type { PublicCatalogExercises } from "../../../../public-catalog/client.ts";
  import { reduceCatalogDraft } from "../../../../public-catalog/draft.ts";
  import PlaceContent from "../place-content/PlaceContent.svelte";
  import { LocalFileHost } from "../../../infra/file-host.ts";
  import type { BankEvent } from "../../../../interaction/bank-events.ts";
  import { stackNodes } from "../../../../interaction/place.ts";
  let { definition, bodyOnly = false, oncatalog }: {
    definition: PublicCatalogExercises; bodyOnly?: boolean; oncatalog?: (event: BankEvent) => void;
  } = $props();
  let draft = $state.raw(untrack(() => definition));
  const host = new LocalFileHost();
  $effect(() => {
    if (!oncatalog && definition.stacks.some(stack => stackNodes(stack.items).some(node => node.kind === 'catalog.card'))) {
      throw new Error('CATALOG_NAVIGATION_HOST_REQUIRED');
    }
  });
  onDestroy(() => host.dispose());
</script>

<div data-local-exercises>
  <PlaceContent definition={draft} {host} {bodyOnly} onevent={event => {
    if (event.kind === 'catalog.open') oncatalog?.(event);
    else draft = reduceCatalogDraft(draft, event);
  }} />
</div>
