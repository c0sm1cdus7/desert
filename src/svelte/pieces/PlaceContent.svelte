<script lang="ts">
  import type { BankEvent } from "../../interaction/bank-events.ts";
  import { placeContent, type PlaceContent } from "../../interaction/place.ts";
  import type { LocalFileHost } from "../controls/file-host.ts";
  import PlaceHeader from "./PlaceHeader.svelte";
  import Stack from "./Stack.svelte";

  let { definition, onevent = () => {}, host, bodyOnly = false }: {
    definition: PlaceContent; onevent?: (event: BankEvent) => void; host?: LocalFileHost; bodyOnly?: boolean;
  } = $props();
  let checked = $derived(placeContent(definition));
</script>

<article class="place-content" data-place-content aria-label={checked.title}>
  {#if !bodyOnly}<PlaceHeader title={checked.title} subtitle={checked.subtitle} />{/if}
  {#each checked.stacks as stack (stack.id)}
    <Stack definition={stack} {onevent} {host} />
  {/each}
</article>
