<script lang="ts">
  // Transport: play or pause the player's media (a part of MediaPlayer; its props are not a contract).
  import { Action } from "../../index.ts";
  import type { MediaPlayback } from "./playback.svelte.ts";
  let { playback }: { playback: MediaPlayback } = $props();
</script>

<Action label={playback.paused ? "Play" : "Pause"} icon={playback.paused ? "play" : "pause"} face="icon" state="ready"
  emphasis="secondary" type="button" onclick={playback.toggle} />
