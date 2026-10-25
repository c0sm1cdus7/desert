<script lang="ts">
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  // MediaStrip: the thumbnails of a viewer's media, the shown one marked current (a part of MediaViewer). `fill` lets the
  // strip take the band's free width between a player's transport and volume.
  import { Image } from "../../index.ts";
  import { pressFeedback } from "../../mechanisms/press-feedback/press-feedback.ts";
  import { imageIdentity, type ViewerMedia } from "../../../infra/media-source.ts";
  let { items, index, fill, onindex }: { items: readonly ViewerMedia[]; index: number; fill: boolean; onindex: (index: number) => void } = $props();
</script>

<div class="strip" class:strip-fill={fill} data-media-thumbs aria-label={say(m.mediaViewer.media)}>
  {#each items as item, i (`${i}:${imageIdentity(item.source)}`)}
    {@const artwork = item.kind === 'image' ? item : item.artwork}
    <button {@attach pressFeedback} type="button" class="strip-item material-pane control-feedback type-control"
      aria-label={`Media ${i + 1}: ${item.alt}`} aria-current={i === index ? 'true' : undefined} onclick={() => onindex(i)}>
      <span class="strip-content control-feedback-content" data-button-content>
        {#if artwork}<Image source={artwork.source} alt="" edge={160} />{:else if item.kind !== 'image'}<Image placeholder={item.kind} />{/if}
      </span>
    </button>
  {/each}
</div>

<style>
  /* Unlayered: a thumbnail's 2px transparent ring replaces the pane material's border. */
  .strip { display:flex; max-width:100%; gap:8px; overflow:auto; padding:8px; }
  .strip-fill { flex:1; min-width:4rem; }
  .strip-item { display:inline-flex; flex:none; align-items:center; justify-content:center; gap:.5rem; width:64px; height:48px; min-height:48px;
    overflow:hidden; padding:0; border:2px solid transparent; border-radius:8px; opacity:.6; color:var(--secondary-foreground); white-space:nowrap; }
  .strip-item[aria-current="true"] { border-color:var(--foreground); opacity:1; }
  .strip-content { position:relative; display:flex; width:100%; height:100%; min-width:0; flex-direction:inherit; align-items:inherit; justify-content:inherit; gap:inherit; }
  @media(max-width:600px) { .strip-fill { flex-basis:100%; order:3; } }
</style>
