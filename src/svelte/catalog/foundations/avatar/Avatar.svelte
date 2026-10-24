<script lang="ts">
  import * as Mark from "../../../vendor/components/ui/avatar/index.js";
  import { Image } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import SeedPortrait from "./SeedPortrait.svelte";
  import ShuffleButton from "./ShuffleButton.svelte";
  let { size, label, interaction, source, shuffleLabel, disabled, onshuffle }: CatalogProps<"avatar"> = $props();
  // The vendor avatar's sizes: an identity portrait (90px), its compact form (44px) and a row's mark (40px).
  const sizes = { portrait: "portrait", compact: "compact", row: "lg" } as const;
  // A seed drawing names itself; a picture or initials are named on the mark, or hidden when the caller gives no label.
  let named = $derived(source.kind !== "seed" && label !== undefined);
</script>

{#snippet mark()}
  <Mark.Root size={sizes[size]} role={named ? "img" : undefined} aria-label={named ? label : undefined}
    aria-hidden={source.kind !== "seed" && !named ? "true" : undefined}>
    {#if source.kind === "seed"}<Mark.Fallback><SeedPortrait seed={source.seed} {label} /></Mark.Fallback>
    {:else if source.kind === "image"}<Image source={source.source} alt="" edge={160} fallback={source.initials} />
    {:else}<Mark.Fallback initials={source.initials} />{/if}
  </Mark.Root>
{/snippet}

{#if interaction === "shuffle"}
  <ShuffleButton {size} label={shuffleLabel} disabled={disabled === true} {onshuffle}>{@render mark()}</ShuffleButton>
{:else}{@render mark()}{/if}
