<script lang="ts">
  import type { NodeEvent } from "../../../../interaction/node-events.ts";
  import { placeContent, type PlaceContent } from "../../../../interaction/place.ts";
  import type { LocalFileHost } from "../../../infra/file-host.ts";
  import { PlaceHeader } from "../../index.ts";
  import { Stack } from "../../index.ts";

  let { definition, onevent = () => {}, host, bodyOnly = false }: {
    definition: PlaceContent; onevent?: (event: NodeEvent) => void; host?: LocalFileHost; bodyOnly?: boolean;
  } = $props();
  let checked = $derived(placeContent(definition));
</script>

<article class="place-content" data-place-content aria-label={checked.title}>
  {#if !bodyOnly}<PlaceHeader title={checked.title} subtitle={checked.subtitle} />{/if}
  {#each checked.stacks as stack (stack.id)}
    <Stack definition={stack} {onevent} {host} />
  {/each}
</article>
