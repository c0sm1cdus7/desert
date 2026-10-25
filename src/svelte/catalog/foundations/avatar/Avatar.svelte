<script lang="ts">
  import * as Mark from "../../../vendor/components/ui/avatar/index.js";
  import { Image } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import SeedPortrait from "./SeedPortrait.svelte";
  import ShuffleButton from "./ShuffleButton.svelte";
  let { size, label, interaction, source, shuffleLabel, disabled, onshuffle }: CatalogProps<"avatar"> = $props();
  // The vendor avatar's sizes: an identity portrait (90px), its compact form (44px) and a row's mark (40px).
  const sizes = { portrait: "portrait", compact: "compact", row: "lg" } as const;
  // A seed drawing names itself; a picture is named on the mark; without a label the whole mark is hidden (decorative).
  let named = $derived(source.kind === "image" && label !== undefined);
  // The picture that could not load: its seed drawing stays, never letters.
  let failed = $state<string | undefined>();
  let pictureKey = $derived(source.kind === "image" ? JSON.stringify(source.source) : undefined);
</script>

{#snippet mark()}
  <Mark.Root size={sizes[size]} role={named ? "img" : undefined} aria-label={named ? label : undefined}
    aria-hidden={label === undefined ? "true" : undefined}>
    <Mark.Fallback><SeedPortrait seed={source.seed} label={source.kind === "seed" ? label : undefined} /></Mark.Fallback>
    {#if source.kind === "image" && failed !== pictureKey}
      <span class="avatar-picture"><Image frame="host" source={source.source} alt="" edge={160} backdrop="none" fallback=""
        onunavailable={() => { failed = pictureKey; }} /></span>
    {/if}
  </Mark.Root>
{/snippet}

{#if interaction === "shuffle"}
  <ShuffleButton {size} label={shuffleLabel} disabled={disabled === true} {onshuffle}>{@render mark()}</ShuffleButton>
{:else}{@render mark()}{/if}

<style>
  /* The picture lies over its seed drawing, in the face's shape: while it loads or when it cannot, the seed shows. */
  .avatar-picture { position:absolute; inset:0; overflow:hidden; border-radius:inherit; }
</style>
