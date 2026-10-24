<script lang="ts">
  import { onDestroy, untrack } from "svelte";
  import type { CatalogProps } from "../../types.d.ts";
  import { reduceCatalogDraft } from "../../../../public-catalog/draft.ts";
  import { PlaceContent } from "../../index.ts";
  import { LocalFileHost } from "../../../infra/file-host.ts";
  import { stackNodes } from "../../../../interaction/place.ts";
  let { definition, bodyOnly = false, oncatalog }: CatalogProps<"local-exercise-content"> = $props();
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
