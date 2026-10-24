<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { Button } from '../../../vendor/components/ui/button/index.js';
  import { Slider } from '../../../vendor/components/ui/slider/index.js';
  import { Icon } from '../../index.ts';
  import { mediaTime } from '../../../infra/playback.svelte.ts';
  let { playback, part, hasCaptions = false }: CatalogProps<"playback-controls"> = $props();
</script>

{#if part === 'transport'}
  <Button variant="secondary" size="icon-lg" aria-label={playback.paused ? 'Play' : 'Pause'} onclick={playback.toggle}>
    {#if playback.paused}<Icon name="play" />{:else}<Icon name="pause" />{/if}
  </Button>
{:else if part === 'volume'}
  <div data-media-volume>
    {#if hasCaptions}<Button variant="secondary" size="icon-lg" aria-label="Captions" aria-pressed={playback.captions} onclick={playback.toggleCaptions}><Icon name="captions" /></Button>{/if}
    <Button variant="secondary" size="icon-lg" aria-label={playback.muted ? 'Unmute' : 'Mute'} onclick={playback.mute}>
      {#if playback.muted}<Icon name="volume-x" />{:else}<Icon name="volume-2" />{/if}
    </Button>
    <Slider type="single" value={playback.muted ? 0 : playback.volume} min={0} max={1} step={0.05}
      aria-label="Volume" onValueChange={playback.setVolume} />
  </div>
{:else}
  <div data-media-seek>
    <span class="type-caption" aria-label="Elapsed time">{mediaTime(playback.position)}</span>
    <Slider type="single" value={playback.position} min={0} max={playback.duration || 1} step={0.1}
      disabled={playback.duration === 0} aria-label="Playback position" onValueChange={playback.seek} />
    <span class="type-caption" aria-label="Duration">{mediaTime(playback.duration)}</span>
  </div>
{/if}
