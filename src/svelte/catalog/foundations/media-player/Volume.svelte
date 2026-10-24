<script lang="ts">
  // Volume: the captions toggle (when the media has captions), mute and the volume slider (a part of MediaPlayer).
  import { Action, Icon } from "../../index.ts";
  // F1-merge: the volume mounts Slider (F1d) instead of the vendor slider, and the toggle presses through the
  // control-feedback utility instead of the vendor button's attachment.
  import { Slider } from "../../../vendor/components/ui/slider/index.js";
  import { pressFeedback } from "../../../vendor/components/ui/button/press-feedback.js";
  import type { MediaPlayback } from "./playback.svelte.ts";
  let { playback, captions }: { playback: MediaPlayback; captions: boolean } = $props();
</script>

<div class="volume">
  <!-- A toggle states its pressed state, which Action's contract cannot (design question for F1b): it is drawn here,
       with the secondary icon action's geometry. -->
  {#if captions}<button {@attach pressFeedback} type="button" class="captions tm-control type-control [&_svg]:size-4 [&_svg]:shrink-0"
    data-material="pane" aria-label="Captions" aria-pressed={playback.captions} onclick={playback.toggleCaptions}>
    <span class="captions-content" data-button-content><Icon name="captions" /></span>
  </button>{/if}
  <!-- F1-merge: Action takes the slice 3 contract (face icon). -->
  <Action label={playback.muted ? "Unmute" : "Mute"} icon={playback.muted ? "muted" : "volume"} face="icon" onclick={playback.mute} />
  <Slider type="single" class="w-24" value={playback.muted ? 0 : playback.volume} min={0} max={1} step={0.05}
    aria-label="Volume" onValueChange={playback.setVolume} />
</div>

<style>
  @layer components {
    .volume { display:flex; align-items:center; gap:8px; }
    .captions { display:inline-flex; flex-shrink:0; align-items:center; justify-content:center; width:2.75rem; height:2.75rem; padding:0;
      border-radius:9999px; color:var(--secondary-foreground); white-space:nowrap; outline:none; }
    .captions-content { position:relative; display:flex; width:100%; min-width:0; align-items:center; justify-content:center; }
  }
  @media(max-width:600px) { .volume { margin-left:auto; } }
</style>
