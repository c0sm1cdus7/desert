<script lang="ts">
  import { Button } from "../vendor/components/ui/button/index.js";
  import Image from "./media/Image.svelte";
  import ArtworkPlaceholder from "./media/ArtworkPlaceholder.svelte";
  import PlaybackControls from "./media/PlaybackControls.svelte";
  import type { ToolbarContent } from "./toolbar-content.ts";
  import { imageIdentity } from "./media/source.ts";
  let { content }: { content: Extract<ToolbarContent, { kind: "media-controls" }> } = $props();
  let selected = $derived(content.items[content.index]!);
</script>

{#if selected.kind !== 'image'}<PlaybackControls playback={content.playback} part="transport" />{/if}
{#if content.items.length > 1}<div data-media-thumbs aria-label="Media">
  {#each content.items as item, i (`${i}:${imageIdentity(item.source)}`)}
    {@const artwork = item.kind === 'image' ? item : item.artwork}
    <Button variant="secondary" aria-label={`Media ${i+1}: ${item.alt}`} aria-current={i===content.index ? 'true' : undefined}
      onclick={()=>content.onindex(i)}>{#if artwork}<Image source={artwork.source} alt="" edge={160} />
      {:else if item.kind !== 'image'}<ArtworkPlaceholder kind={item.kind} />{/if}</Button>
  {/each}
</div>{/if}
{#if selected.kind !== 'image'}<PlaybackControls playback={content.playback} part="volume" hasCaptions={selected.captions.length > 0} />{/if}
