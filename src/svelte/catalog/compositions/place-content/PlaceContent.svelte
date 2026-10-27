<script lang="ts">
  import { placeContent } from "../../../../interaction/place.ts";
  import { PlaceHeading, Stack, ViewRegion } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { definition, onevent, bodyOnly = false }: CatalogProps<"place-content"> = $props();
  const region = $props.id();
  let checked = $derived(placeContent(definition));
</script>

<!-- A place's document, named by its title; its heading is content, never a toolbar. -->
<ViewRegion kind="document" id={region} label={checked.title}>
  {#if !bodyOnly}<PlaceHeading context="embedded" title={checked.title} subtitle={checked.subtitle} />{/if}
  {#each checked.stacks as stack (stack.id)}
    <Stack definition={stack} onevent={event => onevent?.(event)} />
  {/each}
</ViewRegion>
