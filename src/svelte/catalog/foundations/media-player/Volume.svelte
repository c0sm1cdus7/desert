<script lang="ts">
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  // Volume: the captions toggle (when the media has captions), mute and the volume slider (a part of MediaPlayer).
  import { Action, Icon, Slider } from "../../index.ts";
  import { pressFeedback } from "../../mechanisms/press-feedback/press-feedback.ts";
  import type { MediaPlayback } from "./playback.svelte.ts";
  let { playback, captions }: { playback: MediaPlayback; captions: boolean } = $props();
</script>

<div class="volume">
  <!-- A toggle states its pressed state, which Action's contract cannot (design question for F1b): it is drawn here,
       with the secondary icon action's geometry. -->
  {#if captions}<button {@attach pressFeedback} type="button" class="captions material-pane control-feedback type-control [&_svg]:size-4 [&_svg]:shrink-0"
    aria-label={say(m.mediaPlayer.captions)} aria-pressed={playback.captions} onclick={playback.toggleCaptions}>
    <span class="captions-content control-feedback-content disabled-content" data-button-content><Icon name="captions" /></span>
  </button>{/if}
  <Action label={playback.muted ? say(m.mediaPlayer.unmute) : say(m.mediaPlayer.mute)} icon={playback.muted ? "muted" : "volume"} face="icon" state="ready"
    emphasis="secondary" type="button" onclick={playback.mute} />
  <span class="volume-level"><Slider label={say(m.mediaPlayer.volume)} value={playback.muted ? 0 : playback.volume} min={0} max={1} step={0.05}
    disabled={false} onchange={playback.setVolume} /></span>
</div>

<style>
  @layer components {
    .volume { display:flex; align-items:center; gap:8px; }
    .volume-level { display:flex; width:6rem; }
    .captions { display:inline-flex; flex-shrink:0; align-items:center; justify-content:center; width:2.75rem; height:2.75rem; padding:0;
      border-radius:9999px; color:var(--secondary-foreground); white-space:nowrap; outline:none; }
    .captions-content { position:relative; display:flex; width:100%; min-width:0; flex-direction:inherit; align-items:center; justify-content:center; gap:inherit; }
  }
  @media(max-width:600px) { .volume { margin-left:auto; } }
</style>
