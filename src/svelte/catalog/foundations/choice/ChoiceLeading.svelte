<script lang="ts">
  import { AppearancePreview, ArtworkPlaceholder, ColorBullet, Face, Image, Wallpaper } from "../../index.ts";
  import type { ChoiceLeading } from "../../../../interaction/choice.ts";
  // What leads an option. Beside a label (a row, a menu option, a menu trigger) artwork is a 4×3rem preview; above a
  // card's label it fills the card.
  let { leading, frame }: { leading: ChoiceLeading; frame: "mark" | "card" } = $props();
</script>

{#if leading.kind === "face"}<Face face={leading.face} compact />
{:else if leading.kind === "color"}<ColorBullet color={leading.color} />
{:else if leading.kind === "symbol"}<span class="symbol" data-choice-symbol aria-hidden="true">{leading.text}</span>
{:else if leading.kind === "theme"}
  <!-- F1-merge: theme-preview (F1e) replaces the AppearancePreview composition. -->
  <AppearancePreview mode={leading.mode} tint={leading.tint} wallpaper={leading.wallpaper} />
{:else if frame === "card" && leading.kind === "wallpaper"}<Wallpaper wallpaper={leading.wallpaper} preview />
{:else}
  <span class={frame === "mark" ? "preview" : "cover"}>
    {#if leading.kind === "image"}<Image source={leading.source} alt={leading.alt} edge={frame === "mark" ? 96 : 320} />
    <!-- F1-merge: image placeholder (F1e) replaces ArtworkPlaceholder. -->
    {:else if leading.kind === "artwork"}<ArtworkPlaceholder kind={leading.media} />
    {:else}<Wallpaper wallpaper={leading.wallpaper} preview />{/if}
  </span>
{/if}

<style>
  .symbol { display:flex; align-items:center; gap:.5rem; color:var(--muted-foreground); font-size:.875rem; line-height:1.25rem; }
  .preview { display:block; width:4rem; height:3rem; border-radius:.5rem; overflow:hidden; flex-shrink:0; }
  .cover { position:relative; display:block; width:100%; aspect-ratio:4/3; overflow:hidden; border-radius:calc(var(--radius) * .7); }
</style>
