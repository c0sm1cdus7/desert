<script lang="ts">
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  // Transport: play or pause the player's media (a part of MediaPlayer; its props are not a contract).
  import { Action } from "../../index.ts";
  import type { MediaPlayback } from "./playback.svelte.ts";
  let { playback }: { playback: MediaPlayback } = $props();
</script>

<Action label={playback.paused ? say(m.mediaPlayer.play) : say(m.mediaPlayer.pause)} icon={playback.paused ? "play" : "pause"} face="icon" state="ready"
  emphasis="secondary" type="button" onclick={playback.toggle} />
