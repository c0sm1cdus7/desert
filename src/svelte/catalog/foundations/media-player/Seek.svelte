<script lang="ts">
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  // Seek: the elapsed time, the position slider and the duration of the player's media (a part of MediaPlayer).
  import { Slider } from "../../index.ts";
  import { mediaTime, type MediaPlayback } from "./playback.svelte.ts";
  let { playback }: { playback: MediaPlayback } = $props();
</script>

<div class="seek">
  <span class="seek-time type-caption" aria-label={say(m.mediaPlayer.elapsed)}>{mediaTime(playback.position)}</span>
  <Slider label={say(m.mediaPlayer.position)} value={playback.position} min={0} max={playback.duration || 1} step={0.1}
    disabled={playback.duration === 0} onchange={playback.seek} />
  <span class="seek-time type-caption" aria-label={say(m.mediaPlayer.duration)}>{mediaTime(playback.duration)}</span>
</div>

<style>
  @layer components {
    .seek { display:flex; align-items:center; gap:12px; width:100%; }
    .seek-time { color:var(--muted-foreground); white-space:nowrap; font-variant-numeric:tabular-nums; }
  }
</style>
