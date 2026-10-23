<script lang="ts">
  import { Button } from '../../vendor/components/ui/button/index.js';
  import { Slider } from '../../vendor/components/ui/slider/index.js';
  import Play from '@lucide/svelte/icons/play';
  import Pause from '@lucide/svelte/icons/pause';
  import Volume from '@lucide/svelte/icons/volume-2';
  import Muted from '@lucide/svelte/icons/volume-x';
  import Captions from '@lucide/svelte/icons/captions';
  import { mediaTime, type MediaPlayback } from './playback.svelte.ts';
  let { playback, part, hasCaptions = false }: {
    playback: MediaPlayback; part: 'transport' | 'volume' | 'seek'; hasCaptions?: boolean;
  } = $props();
</script>

{#if part === 'transport'}
  <Button variant="secondary" size="icon-lg" aria-label={playback.paused ? 'Play' : 'Pause'} onclick={playback.toggle}>
    {#if playback.paused}<Play />{:else}<Pause />{/if}
  </Button>
{:else if part === 'volume'}
  <div data-media-volume>
    {#if hasCaptions}<Button variant="secondary" size="icon-lg" aria-label="Captions" aria-pressed={playback.captions} onclick={playback.toggleCaptions}><Captions /></Button>{/if}
    <Button variant="secondary" size="icon-lg" aria-label={playback.muted ? 'Unmute' : 'Mute'} onclick={playback.mute}>
      {#if playback.muted}<Muted />{:else}<Volume />{/if}
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
