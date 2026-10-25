<script lang="ts">
  import { untrack } from "svelte";
  import type { CatalogProps } from "../../types.d.ts";
  import { reduceCatalogDraft } from "../../../../public-catalog/draft.ts";
  import { PlaceContent } from "../../index.ts";
  import { provideFileHost } from "../../../infra/file-host-context.ts";
  import { stackNodes } from "../../../../interaction/place.ts";
  let { definition, bodyOnly = false, oncatalog }: CatalogProps<"local-exercise-content"> = $props();
  let draft = $state.raw(untrack(() => definition));
  // The exercises' file controls read this host by context; it is disposed with the exercises.
  provideFileHost();
  $effect(() => {
    if (!oncatalog && definition.stacks.some(stack => stackNodes(stack.items).some(node => node.kind === 'catalog.card'))) {
      throw new Error('CATALOG_NAVIGATION_HOST_REQUIRED');
    }
  });
</script>

<PlaceContent definition={draft} {bodyOnly} onevent={event => {
  if (event.kind === 'catalog.open') oncatalog?.(event);
  else draft = reduceCatalogDraft(draft, event);
}} />
